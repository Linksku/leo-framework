import cluster from 'cluster';

import generateRandUnsignedInt from 'utils/generateRandUnsignedInt';
import createBullQueue, { wrapProcessJob } from 'helpers/createBullQueue';
import SseBroadcastManager from 'services/sse/SseBroadcastManager';
import { NUM_CLUSTER_SERVERS } from 'serverSettings';

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

      const notifs = await TS.defined(notifTypes[type])
        .genNotifs(params, currentUserId);
      const notifsFiltered = notifs.filter(n => n.userId !== currentUserId);
      if (notifs.length !== notifsFiltered.length) {
        ErrorLogger.warn(new Error(`NotifsManager.queue.process(${type}): genNotifs returned currentUserId`));
      }

      if (notifsFiltered.length) {
        const notifObjs = notifsFiltered.map(n => ({
          notifType: type,
          userId: n.userId,
          groupingId: n.groupingId ?? generateRandUnsignedInt(),
          time: new Date(),
          params,
          hasRead: false,
        }));
        const insertedNotifs = await Notif.insertBulk(
          notifObjs,
          { onDuplicate: 'update' },
        );

        for (const notif of insertedNotifs) {
          // todo: high/hard permissions for listening to SSEs
          SseBroadcastManager.broadcastData(
            'notifCreated',
            { userId: notif.userId },
            {
              data: null,
              createdEntities: [notif],
            },
          );
        }
      }
    })),
    'fatal',
    'Process notifs queue',
  );
}

export async function decorateNotifs(notifs: Notif[]) {
  const renderedArr = await Promise.all(
    notifs.map(
      async notif => TS.defined(notifTypes[notif.notifType])
        .renderNotif(notif, notif.params),
    ),
  );

  for (const [i, rendered] of renderedArr.entries()) {
    if (rendered) {
      const extras = TS.objValOrSetDefault(notifs[i], 'extras', {});
      extras.content = rendered.content;
      extras.path = rendered.path;
    }
  }
}
