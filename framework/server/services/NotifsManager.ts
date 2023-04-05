import cluster from 'cluster';
import fromPairs from 'lodash/fromPairs';
import uniq from 'lodash/uniq';

import type { SseData } from 'services/sse/SseBroadcastManager';
import generateRandUnsignedInt from 'utils/generateRandUnsignedInt';
import createBullQueue, { wrapProcessJob } from 'helpers/createBullQueue';
import SseBroadcastManager from 'services/sse/SseBroadcastManager';
import formatApiSuccessResponse from 'routes/api/helpers/formatApiSuccessResponse';
import { NUM_CLUSTER_SERVERS } from 'serverSettings';
import firebaseAdmin from 'services/firebaseAdmin';
import { HOME_URL } from 'settings';

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
- mobile
- email/sms
*/

type GenNotifs<Params> = (params: Params, currentUserId: EntityId) =>
  | {
    userId: EntityId,
    groupingId: number | null,
  }[]
  | Promise<{
    userId: EntityId,
    groupingId: number | null,
  }[]>;

type RenderNotif<Params> = (notif: Notif, params: Params) =>
  | {
    content: string,
    path: string,
  }
  | null
  | Promise<{
    content: string,
    path: string,
  } | null>;

export interface NotifType<T extends string, Params> {
  type: T,
  genNotifs: GenNotifs<Params>,
  // note: be careful of n+1 in renderNotif
  renderNotif: RenderNotif<Params>,
  queue: (params: Params, currentUserId: EntityId) => void,
}

const queue = createBullQueue<{
  type: string,
  params: any,
  time: number,
  currentUserId: EntityId,
}>('NotifsManager');

const notifTypes = Object.create(null) as ObjectOf<NotifType<string, any>>;

export async function decorateNotifs(notifs: Notif[]) {
  const renderedArr = await Promise.all(
    notifs.map(
      async notif => TS.defined(notifTypes[notif.notifType])
        .renderNotif(notif, notif.params),
    ),
  );

  for (let i = 0; i < renderedArr.length; i++) {
    const rendered = renderedArr[i];
    if (rendered) {
      const extras = TS.objValOrSetDefault(notifs[i], 'extras', {});
      extras.content = rendered.content;
      extras.path = rendered.path;
    }
  }
}

export function registerNotifType<Params, T extends string = string>(
  type: T,
  genNotifs: GenNotifs<Params>,
  renderNotif: RenderNotif<Params>,
): NotifType<T, Params> {
  if (notifTypes[type]) {
    throw new Error(`NotifsManager.registerNotifType: notification type "${type}" already defined.`);
  }
  const notifConfig = {
    type,
    genNotifs,
    renderNotif,
    queue(params: Params, currentUserId: EntityId) {
      wrapPromise(
        queue.add({
          type,
          params,
          time: Date.now(),
          currentUserId,
        }, {
          removeOnComplete: true,
          removeOnFail: true,
          attempts: 2,
          backoff: 1000,
        }),
        'fatal',
        `Register notif type ${type}`,
      );
    },
  };

  notifTypes[type] = notifConfig;
  return notifConfig;
}

if (!cluster.isMaster || NUM_CLUSTER_SERVERS === 1) {
  wrapPromise(
    queue.process(wrapProcessJob(async job => {
      const { type, params, currentUserId } = job.data;

      let notifs = await TS.defined(notifTypes[type])
        .genNotifs(params, currentUserId);
      if (!process.env.PRODUCTION && notifs.some(n => n.userId === currentUserId)) {
        ErrorLogger.warn(new Error(`NotifsManager.queue.process(${type}): genNotifs returned currentUserId`));
      }
      notifs = notifs.filter(n => n.userId !== currentUserId);

      if (!notifs.length) {
        return;
      }

      const notifObjs = notifs.map(n => ({
        notifType: type,
        userId: n.userId,
        groupingId: n.groupingId ?? generateRandUnsignedInt(),
        time: new Date(),
        params,
        hasRead: false,
      }));
      const { insertedNotifs, userIdToDevices } = await promiseObj({
        insertedNotifs: Notif.insertBulk(
          notifObjs,
          { onDuplicate: 'update' },
        ),
        userIdToDevices: promiseObj(fromPairs(
          uniq(notifs.map(n => n.userId))
            .map(userId => [userId, UserDevice.selectAll({ userId })]),
        )),
      });
      await decorateNotifs(insertedNotifs);

      await Promise.all(insertedNotifs.map(async notif => {
        if (!notif.extras?.content || !notif.extras?.path) {
          return;
        }

        // todo: high/hard permissions for listening to SSEs
        SseBroadcastManager.broadcastData(
          'notifCreated',
          { userId: notif.userId },
          {
            data: null,
            createdEntities: [notif],
          },
        );

        const notifDevices = userIdToDevices[notif.userId];
        if (notifDevices) {
          const data = await formatApiSuccessResponse<any>({
            data: {
              title: notif.extras.content,
              path: notif.extras.path,
            },
            createdEntities: [notif],
          } as SseData);
          const dataStr = JSON.stringify(data);

          // eslint-disable-next-line no-await-in-loop
          await Promise.all(notifDevices.map(async device => {
            if (device.registrationToken && notif.extras?.content && notif.extras?.path) {
              const notifData = process.env.SERVER === 'production'
                ? {
                  notification: {
                    title: notif.extras.content,
                  },
                  webpush: {
                    fcmOptions: {
                      // https is required, so doesn't work yet in dev
                      link: `${HOME_URL}${notif.extras.path}`,
                    },
                  },
                }
                : {};
              try {
                await firebaseAdmin.messaging().send({
                  ...notifData,
                  token: device.registrationToken,
                  data: {
                    data: dataStr,
                  },
                });
              } catch (err) {
                ErrorLogger.warn(err, { ctx: 'NotifsManager' });
              }
            }
          }));
        }
      }));
    })),
    'fatal',
    'Process notifs queue',
  );
}
