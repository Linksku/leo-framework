import { defineApi } from 'services/ApiManager';
import { LAST_SEEN_NOTIFS_TIME, LAST_SEEN_CHATS_TIME } from 'consts/coreUserMetaKeys';
import paginateQuery from 'lib/dbUtils/paginateQuery';
import { decorateNotifs } from 'services/NotifsManager';
import { toDbDateTime } from 'lib/dbUtils/dbDate';

defineApi(
  {
    name: 'unseenNotifIds',
    auth: true,
    paramsSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
    dataSchema: {
      type: 'object',
      required: ['notifIds'],
      properties: {
        notifIds: {
          type: 'object',
          patternProperties: {
            '^.*$': SchemaConstants.idArr,
          },
          // @ts-ignore tsType
          tsType: 'ObjectOf<number[]>',
        },
      },
      additionalProperties: false,
    },
  },
  async function getUnseenNotifIds({ currentUserId }) {
    const { lastSeenNotifsRow, lastSeenChatsRow } = await promiseObj({
      lastSeenNotifsRow: UserMeta.selectOne({
        metaKey: LAST_SEEN_NOTIFS_TIME,
        userId: currentUserId,
      }),
      lastSeenChatsRow: UserMeta.selectOne({
        metaKey: LAST_SEEN_CHATS_TIME,
        userId: currentUserId,
      }),
    });

    const { chatReplyNotifs, otherNotifs } = await promiseObj({
      chatReplyNotifs: Notif.query()
        .select('id')
        .where({
          userId: currentUserId,
          hasRead: false,
          notifType: 'chatReplyCreated',
        })
        .where(builder => {
          if (lastSeenChatsRow?.metaValue) {
            void builder.where(
              Notif.cols.time,
              '>',
              toDbDateTime(new Date(lastSeenChatsRow.metaValue)),
            );
          }
        })
        .limit(9),
      otherNotifs: Notif.query()
        .select(['notifType', 'id'])
        .where({
          userId: currentUserId,
          hasRead: false,
        })
        .whereNot('notifType', 'chatReplyCreated')
        .where(builder => {
          if (lastSeenNotifsRow?.metaValue) {
            void builder.where(
              Notif.cols.time,
              '>',
              toDbDateTime(new Date(lastSeenNotifsRow.metaValue)),
            );
          }
        })
        .limit(9),
    });

    const notifIds: ObjectOf<EntityId[]> = {
      chatReplyCreated: chatReplyNotifs.map(notif => notif.id),
    };
    for (const notif of otherNotifs) {
      const arr = TS.objValOrSetDefault(notifIds, notif.notifType, []);
      arr.push(notif.id);
    }

    return {
      entities: [],
      data: {
        notifIds,
      },
    };
  },
);

defineApi(
  {
    name: 'notifs',
    auth: true,
    paramsSchema: {
      type: 'object',
      properties: {
        limit: SchemaConstants.limit,
        cursor: SchemaConstants.cursor,
      },
      additionalProperties: false,
    },
    dataSchema: SchemaConstants.pagination,
  },
  async function getNotifs({ currentUserId, limit, cursor }) {
    const query = Notif.query()
      .select(Notif.cols.all)
      .where(Notif.cols.userId, currentUserId);

    let { entities: notifs, data } = await paginateQuery(
      query,
      [
        {
          column: raw('extract(epoch from "notifs"."time")'),
          columnWithoutTransforms: Notif.cols.time,
          order: 'desc',
        },
        { column: Notif.cols.id, order: 'desc' },
      ],
      { limit, cursor },
    );
    await decorateNotifs(notifs);
    notifs = notifs.filter(n => n.extras?.content && n.extras?.path);

    return {
      entities: notifs,
      data,
    };
  },
);

defineApi(
  {
    method: 'post',
    name: 'seenNotifs',
    auth: true,
    paramsSchema: {
      type: 'object',
      required: ['notifType'],
      properties: {
        notifType: {
          type: 'string',
          enum: ['notifs', 'chats'],
        },
      },
      additionalProperties: false,
    },
  },
  function seenNotifs({ currentUserId, notifType }) {
    void wrapPromise(
      UserMeta.insertBT({
        userId: currentUserId,
        metaKey: notifType === 'chats'
          ? LAST_SEEN_CHATS_TIME
          : LAST_SEEN_NOTIFS_TIME,
        metaValue: toDbDateTime(new Date()),
      }, {
        onDuplicate: 'update',
      }),
      'warn',
      'Update last view notifs times',
    );
    return {
      data: null,
    };
  },
);

defineApi(
  {
    method: 'post',
    name: 'readNotif',
    auth: true,
    paramsSchema: {
      type: 'object',
      required: ['notifId'],
      properties: {
        notifId: SchemaConstants.id,
      },
      additionalProperties: false,
    },
  },
  async function readNotif({ notifId, currentUserId }) {
    const notif = await Notif.selectOne({ id: notifId });
    if (!notif || notif.userId !== currentUserId) {
      throw new HandledError('Can\'t find notif.', 404);
    }

    await Notif.updateBT({ id: notifId }, {
      hasRead: true,
    });
    return {
      data: null,
    };
  },
);
