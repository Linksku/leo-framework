import generateRandUnsignedInt from 'utils/generateRandUnsignedInt';
import createBullQueue, { wrapProcessJob } from 'helpers/createBullQueue';
import SseBroadcastManager from './SseBroadcastManager';

type GenNotifs<Params> = (params: Params, currentUserId: EntityId) => {
  userId: EntityId,
  groupingId: number | null,
}[] | Promise<{
  userId: EntityId,
  groupingId: number | null,
}[]>;

type RenderNotif<Params> = (notif: Notif, params: Params) => {
  content: string,
  path: string,
} | null | Promise<{
  content: string,
  path: string,
} | null>;

export interface NotifType<T extends string, Params> {
  type: T,
  genNotifs: GenNotifs<Params>,
  // note: be careful of n+1
  render: RenderNotif<Params>,
  queue: (params: Params, currentUserId: EntityId) => void,
}

export const MAX_NOTIFS_PER_EVENT = 1000;

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
  render: RenderNotif<Params>,
): NotifType<T, Params> {
  if (notifTypes[type]) {
    throw new Error(`Notification type "${type}" already defined.`);
  }
  const notifType = {
    type,
    genNotifs,
    render,
    // todo: mid/hard dedupe/batch to handle high load
    queue(params: Params, currentUserId: EntityId) {
      void wrapPromise(
        queue.add({
          type,
          params,
          time: Date.now(),
          currentUserId,
        }, {
          removeOnComplete: true,
          removeOnFail: true,
        }),
        'fatal',
        `Register notif type ${type}`,
      );
    },
  };

  notifTypes[type] = notifType;
  return notifType;
}

void wrapPromise(
  queue.process(wrapProcessJob(async job => {
    const { type, params, currentUserId } = job.data;

    let notifs = await TS.defined(notifTypes[type]).genNotifs(params, currentUserId);
    notifs = notifs.filter(n => n.userId !== currentUserId);

    if (notifs.length) {
      const notifObjs = notifs.map(n => ({
        notifType: type,
        userId: n.userId,
        groupingId: n.groupingId ?? generateRandUnsignedInt(),
        time: new Date(),
        params,
        hasRead: false,
      }));
      const insertedNotifs = await Notif.insertBulk(
        notifObjs,
        'update',
      );

      for (const notif of insertedNotifs) {
        // todo: high/mid permissions for listening to SSEs
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

export async function decorateNotifs(notifs: Notif[]) {
  const renderedArr = await Promise.all(
    notifs.map(
      async notif => TS.defined(notifTypes[notif.notifType]).render(notif, notif.params),
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
