import knex from 'services/knex';
import generateRandUnsignedInt from 'lib/generateRandUnsignedInt';
import createBullQueue from 'lib/createBullQueue';

type GenNotifs<Params> = (params: Params, currentUserId: number) => Promise<{
  userId: number,
  groupingId: number | null,
}[]>;

type RenderNotif<Params> = (notif: Notif, params: Params) => Promise<{
  content: string,
  path: string,
} | null>;

interface NotifType<T extends string, Params> {
  type: T,
  genNotifs: GenNotifs<Params>,
  // note: be careful of n+1
  render: RenderNotif<Params>,
  queue: (params: Params, currentUserId: number) => void,
}

const queue = createBullQueue<{
  type: string,
  params: any,
  time: number,
  currentUserId: number,
}>('NotifsManager');

const notifTypes = Object.create(null) as ObjectOf<NotifType<string, any>>;

export function createNotifType<Params, T extends string = string>(
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
    queue(params: Params, currentUserId: number) {
      void queue.add({
        type,
        params,
        time: Date.now(),
        currentUserId,
      }, {
        removeOnComplete: true,
        removeOnFail: true,
      });
    },
  };

  notifTypes[type] = notifType;
  return notifType;
}

void queue.process(async job => {
  const { type, params, currentUserId } = job.data;

  let notifs = await defined(notifTypes[type]).genNotifs(params, currentUserId);
  notifs = notifs.filter(n => n.userId !== currentUserId);
  for (const n of notifs) {
    if (n.groupingId === null) {
      n.groupingId = generateRandUnsignedInt();
    }
  }

  if (notifs.length) {
    await knex('notifs')
      .insert(notifs.map(n => ({
        notifType: type,
        userId: n.userId,
        groupingId: n.groupingId,
        params: JSON.stringify(params),
        hasRead: false,
      })))
      .onConflict(['notifType', 'userId', 'groupingId'])
      .merge({
        time: raw('NOW()'),
        hasRead: false,
      });
  }
});

export async function decorateNotifs(notifs: Notif[]) {
  const renderedArr = await Promise.all(
    notifs.map(
      async notif => defined(notifTypes[notif.notifType]).render(notif, notif.params),
    ),
  );

  for (const [i, rendered] of renderedArr.entries()) {
    if (rendered) {
      notifs[i].extras.content = rendered.content;
      notifs[i].extras.path = rendered.path;
    }
  }
}
