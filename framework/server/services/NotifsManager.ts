import {
  type Message,
  type AndroidConfig,
  type ApnsConfig,
  type WebpushConfig,
} from 'firebase-admin/messaging';
import uniq from 'lodash/uniq.js';
import uniqBy from 'lodash/uniqBy.js';

import type { SseData } from 'services/sse/SseBroadcastManager';
import type { NotifScope, NotifChannel } from 'config/notifs';
import { FcmNotifData, NOTIF_APPROX_MAX_LENGTH } from 'consts/notifs';
import {
  NOTIF_SCOPES,
  NOTIF_CHANNELS,
  NOTIF_CHANNEL_CONFIGS,
} from 'config/notifs';
import generateRandUnsignedInt from 'utils/generateRandUnsignedInt';
import createBullQueue, { createBullWorker } from 'services/bull/createBullQueue';
import SseBroadcastManager from 'services/sse/SseBroadcastManager';
import formatApiSuccessResponse from 'routes/apis/formatApiSuccessResponse';
import getFirebaseAdmin from 'services/getFirebaseAdmin';
import { HOME_URL } from 'consts/server';
import truncateStr from 'utils/truncateStr';
import sendSimpleEmail from 'services/email/sendSimpleEmail';
import isSecondaryServer from 'utils/isSecondaryServer';
import { Queue } from 'bullmq';

/*
todo: high/hard make notifs scaleable
Maybe make each notif an mv, use mz tail to trigger sending

Note: notif manager should support use cases:

Timing:
- immediate
- scheduled

Deduping:
- never
- time interval
- if unread
- always

Intent:
- transactional
- promotional

Delivery:
- in-app
  - notifications tab
  - private msgs tab
- mobile
- email
- sms
*/

type NotifConfig = {
  type: string,
  scope: NotifScope,
  channel: NotifChannel,
  sendPush?: boolean,
  sendEmail?: boolean,
  // Dedupe push/email, not in-app
  // 'always' = always filter, 0 = never filter
  dedupeInterval?: number | 'always',
};

type NotifObj<Params> = {
  userId: EntityId,
  groupingId: number | null,
  params: Params,
};

type GenNotifs<Input extends JsonObj, Params> = (input: Input) =>
  | NotifObj<Params>[]
  | Promise<NotifObj<Params>[] | null>
  | null;

type RenderedNotif = {
  content: string,
  contentBoldRanges?: [number, number][],
  path: string,
  emailSubject?: string,
  emailBody?: (
    | string
    | { url: string, text?: string }
    | (string | { url: string, text?: string })[]
  )[],
  emailUnsubUrl?: string,
  emailUnsubText?: string,
};

type RenderNotif<Params> = (
  notif: NotifModel,
  // Partial because db could have old params
  params: ObjectOf<unknown> & Partial<Params>,
) =>
  | RenderedNotif
  | null
  | Promise<RenderedNotif | null>;

export const PLATFORM_TO_OS = {
  'desktop-web': 'desktop-web',
  'android-web': 'android',
  'android-standalone': 'android',
  'android-native': 'android',
  'ios-web': 'ios',
  'ios-standalone': 'ios',
  'ios-native': 'ios',
  'other-web': 'other',
  'other-standalone': 'other',
  'other-native': 'other',
} satisfies Record<PlatformType, string>;

let notifsQueue: Queue<{
  type: string,
  input: any,
  time: number,
}> | null = null;

const notifConfigs = new Map<string, NotifConfig & {
  genNotifs: GenNotifs<any, any>,
  // note: be careful of n+1 in renderNotif
  renderNotif: RenderNotif<any>,
}>();

export function registerNotifType<T extends NotifConfig, Input extends JsonObj, Params>(
  config: SetOptional<T, 'scope' | 'channel'>,
  genNotifs: GenNotifs<Input, Params>,
  renderNotif: RenderNotif<Params>,
): {
  config: NotifConfig,
  queue: (params: Input) => void,
} {
  if (notifConfigs.has(config.type)) {
    throw new Error(`NotifsManager.registerNotifType: notification type "${config.type}" already defined.`);
  }

  const fullConfig = {
    scope: NOTIF_SCOPES.GENERAL,
    channel: NOTIF_CHANNELS.GENERAL,
    dedupeInterval: 24 * 60 * 60 * 1000,
    ...config,
  };
  notifConfigs.set(config.type, {
    ...fullConfig,
    genNotifs,
    renderNotif,
  });
  return {
    config: fullConfig,
    queue(input: Input) {
      if (!notifsQueue) {
        notifsQueue = createBullQueue('NotifsManager');
      }
      wrapPromise(
        notifsQueue.add(
          'NotifsManager',
          {
            type: config.type,
            input,
            time: Date.now(),
          },
          {
            removeOnComplete: true,
            removeOnFail: true,
            attempts: 2,
            backoff: 1000,
          },
        ),
        'fatal',
        `Register notif type ${config.type}`,
      );
    },
  };
}

export function getRenderedNotifs(
  notifs: NotifModel[],
): Promise<((RenderedNotif & {
  notifId: EntityId,
}) | null)[]> {
  return Promise.all(notifs.map(async notif => {
    const config = notifConfigs.get(notif.notifType);
    if (!config) {
      return null;
    }
    const ret = config.renderNotif(notif, notif.params);
    const rendered = ret instanceof Promise
      ? await withErrCtx(
        ret,
        `${notif.notifType}.renderNotif`,
      )
      : ret;
    if (!rendered) {
      return null;
    }

    if (!process.env.PRODUCTION && rendered.content.length > NOTIF_APPROX_MAX_LENGTH * 1.5) {
      ErrorLogger.error(
        new Error(`NotifsManager.getRenderedNotifs(${notif.notifType}): content too long`),
        { content: rendered.content },
      );
    }

    return {
      ...rendered,
      notifId: notif.id,
      content: truncateStr(rendered.content, NOTIF_APPROX_MAX_LENGTH * 1.5),
    };
  }));
}

async function getThrottledUsers<T>(
  notifType: string,
  dedupeInterval: number | 'always',
  notifs: NotifObj<T>[],
): Promise<EntityId[]> {
  if (dedupeInterval === 0) {
    return [];
  }

  const possiblyThrottledNotifs = notifs
    .filter(notif => notif.groupingId != null);
  const existingNotifs = await NotifModel.selectBulk(possiblyThrottledNotifs.map(n => ({
    notifType,
    userId: n.userId,
    groupingId: TS.notNull(n.groupingId),
  })));
  return notifs
    .filter(notif => {
      const throttledNotif = existingNotifs
        .find(d => d.userId === notif.userId && d.groupingId === notif.groupingId);
      if (!throttledNotif) {
        return false;
      }
      if (dedupeInterval === 'always') {
        return true;
      }

      const timeDiff = Date.now() - throttledNotif.time.getTime();
      return timeDiff < dedupeInterval;
    })
    .map(notif => notif.userId);
}

// todo: mid/mid images in push notifs
async function sendPushNotifs(
  config: NotifConfig,
  notif: NotifModel,
  rendered: RenderedNotif,
  notifDevices: UserDeviceModel[],
) {
  notifDevices = notifDevices.filter(d => d.registrationToken);
  if (!notifDevices.length) {
    return;
  }
  notifDevices.sort((a, b) => b.lastSeenTime.getTime() - a.lastSeenTime.getTime());
  notifDevices = uniqBy(
    notifDevices,
    d => PLATFORM_TO_OS[d.platform as PlatformType],
  );

  const apiData = await formatApiSuccessResponse('sse' as any, {
    data: null,
    createdEntities: [notif],
  } satisfies SseData);

  await Promise.all(notifDevices.map(async device => {
    const msg: Message = {
      notification: {
        title: rendered.content,
      },
      token: TS.notNull(device.registrationToken),
    };
    const data = {
      title: rendered.content,
      path: rendered.path,
      apiData: JSON.stringify(apiData),
    } satisfies FcmNotifData;

    const os = PLATFORM_TO_OS[device.platform as PlatformType];
    const collapseKey = notif.groupingId ? `${notif.notifType}:${notif.groupingId}` : null;
    if (os === 'android') {
      const androidMsg: AndroidConfig = { data };

      if (collapseKey) {
        androidMsg.collapseKey = collapseKey;
        androidMsg.notification = {
          channelId: config.channel,
        };
      }

      msg.android = androidMsg;
    } else if (os === 'ios') {
      const iosMsg: ApnsConfig = {
        payload: {
          ...data,
          aps: {},
        },
      };

      if (collapseKey) {
        TS.defined(iosMsg.payload).aps.threadId = collapseKey;
      }

      msg.apns = iosMsg;
    } else {
      const webMsg: WebpushConfig = { data };
      if (process.env.SERVER === 'production') {
        webMsg.fcmOptions = {
          // https is required, so doesn't work yet in dev
          link: HOME_URL + rendered.path,
        };
      }

      msg.webpush = webMsg;
    }

    try {
      const admin = await getFirebaseAdmin();
      await admin.messaging().send(msg);
    } catch (err) {
      if (TS.isObj(err)
        && TS.hasProp(err, 'code')
        && err.code === 'messaging/registration-token-not-registered') {
        await UserDeviceModel.deleteOne({ id: device.id });
      } else {
        ErrorLogger.warn(err, { ctx: 'NotifsManager.firebaseAdmin.messaging()' });
      }
    }
  }));
}

async function sendEmails(
  notif: NotifModel,
  rendered: RenderedNotif,
  user: UserModel,
) {
  if (!rendered.emailSubject || !rendered.emailBody?.length) {
    throw new Error(`NotifsManager.sendEmails(${notif.notifType}): email not rendered`);
  }

  await sendSimpleEmail({
    to: user.email,
    subject: rendered.emailSubject,
    body: rendered.emailBody,
    unsubUrl: rendered.emailUnsubUrl ?? `${HOME_URL}/notifsettings`,
    unsubText: rendered.emailUnsubText ?? 'Unsubscribe',
  });
}

if (isSecondaryServer) {
  createBullWorker(
    'NotifsManager',
    async job => {
      const { type, input } = job.data;

      const config = TS.defined(notifConfigs.get(type));
      const channelConfig = NOTIF_CHANNEL_CONFIGS[config.channel];
      const ret = config.genNotifs(input);
      let notifs = ret instanceof Promise
        ? await withErrCtx(
          ret,
          `${type}.genNotifs`,
        )
        : ret;
      if (!notifs) {
        if (!process.env.PRODUCTION) {
          printDebug(
            `NotifsManager.process(${type}): no notifs`,
            'info',
          );
        }
        return;
      }

      if (!process.env.PRODUCTION) {
        const invalidNotif = notifs.find(n => !n.userId || !n.groupingId || !n.params);
        if (invalidNotif) {
          ErrorLogger.warn(
            new Error(`NotifsManager.queue.process(${type}): genNotifs returned invalid notifs`),
            { notif: invalidNotif },
          );
        }

        const dupNotif = notifs.find(n => notifs?.some(
          n2 => n2 !== n && n2.userId === n.userId && n2.groupingId === n.groupingId,
        ));
        if (dupNotif) {
          ErrorLogger.warn(
            new Error(`NotifsManager.queue.process(${type}): genNotifs returned duplicate notifs`),
            { notif: dupNotif },
          );
        }
      }

      const { currentUserId } = input;
      if (currentUserId) {
        if (!process.env.PRODUCTION && notifs.some(n => n.userId === currentUserId)) {
          ErrorLogger.warn(new Error(
            `NotifsManager.queue.process(${type}): genNotifs returned currentUserId`,
          ));
        }

        notifs = notifs.filter(n => n.userId !== currentUserId);
        if (!notifs.length) {
          return;
        }
      }

      if (!process.env.PRODUCTION && notifs.length > 1000) {
        ErrorLogger.warn(new Error(
          `NotifsManager.queue.process(${type}): genNotifs returned >1000 notifs`,
        ));
      }

      const throttledUsers = config.dedupeInterval
        ? await getThrottledUsers(type, config.dedupeInterval, notifs)
        : [];

      const notifObjs = notifs.map(n => ({
        scope: config.scope,
        notifType: type,
        userId: n.userId,
        groupingId: n.groupingId ?? generateRandUnsignedInt(),
        time: new Date(),
        params: n.params,
        hasRead: false,
      }));
      const uniqUserIds = uniq(notifs.map(n => n.userId));
      const {
        insertedNotifs,
        userIdToDevices,
        users,
        userVerified,
        notifSettings,
      } = await promiseObj({
        insertedNotifs: NotifModel.insertBulk(
          notifObjs,
          { onDuplicate: 'update' },
        ),
        userIdToDevices: config.sendPush
          ? promiseObj(Object.fromEntries(
            uniqUserIds.map(userId => [userId, UserDeviceModel.selectAll({ userId })]),
          ))
          : null,
        users: UserModel.selectBulk(
          uniqUserIds.map(id => ({ id })),
        ),
        userVerified: config.sendEmail
          ? UserAuthModel.selectBulkCol(
            uniqUserIds.map(userId => ({ userId })),
            'isEmailVerified',
            { keepUndefined: true },
          )
          : null,
        notifSettings: config.sendPush || config.sendEmail
          ? NotifSettingModel.selectBulk(
            uniqUserIds.map(userId => ({
              userId,
              channel: config.channel,
            })),
          )
          : null,
      });
      const renderedNotifs = await getRenderedNotifs(insertedNotifs);

      if (!process.env.PRODUCTION) {
        printDebug(
          `NotifsManager.process(${type}): ${insertedNotifs.length} notifs`,
          'info',
        );
      }

      await Promise.all(insertedNotifs.map(async (notif, idx) => {
        const rendered = renderedNotifs[idx];
        if (!rendered) {
          return;
        }

        SseBroadcastManager.send(
          'notifCreated',
          { userId: notif.userId },
          {
            data: null,
            createdEntities: TS.filterNulls([
              notif,
              notif.scope === NOTIF_SCOPES.GENERAL
                ? VirtualRenderedNotif.create({
                  notifId: notif.id,
                  content: rendered.content,
                  contentBoldRanges: rendered.contentBoldRanges,
                  path: rendered.path,
                })
                : null,
            ]),
          },
        );

        if (!config.sendPush && !config.sendEmail) {
          return;
        }
        if (throttledUsers.includes(notif.userId)) {
          return;
        }
        const user = users.find(u => u.id === notif.userId);
        if (!user || user.isDeleted) {
          return;
        }

        const notifSetting = notifSettings?.find(s => s.userId === notif.userId);
        const canPush = notifSetting?.push ?? channelConfig.defaultSettings.push;
        const canEmail = channelConfig.canEmail
          ? (notifSetting?.email ?? channelConfig.defaultSettings.email)
          : false;
        const notifDevices = userIdToDevices?.[notif.userId];
        await Promise.all([
          config.sendPush
            && canPush
            && notifDevices
            && sendPushNotifs(config, notif, rendered, notifDevices)
              // Need catch to prevent Bull from retrying
              .catch(err => {
                ErrorLogger.warn(
                  err,
                  { ctx: 'NotifsManager.sendPushNotifs', notifId: notif.id },
                );
              }),
          config.sendEmail
            && canEmail
            && user
            && userVerified?.[uniqUserIds.indexOf(notif.userId)]
            && sendEmails(notif, rendered, user)
              .catch(err => {
                ErrorLogger.warn(
                  err,
                  { ctx: 'NotifsManager.sendEmails', notifId: notif.id },
                );
              }),
        ]);
      }));
    },
    {
      concurrency: 10,
    },
  );
}
