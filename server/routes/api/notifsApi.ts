import { defineApi } from 'services/ApiManager';
import { LAST_SEEN_NOTIFS_TIME } from 'consts/coreUserMetaKeys';
import paginateQuery from 'lib/paginateQuery';
import { decorateNotifs } from 'services/NotifsManager';
import { toMysqlDateTime } from 'lib/mysqlDate';
import countQuery from 'lib/countQuery';

defineApi(
  {
    name: 'notifsCount',
    auth: true,
    paramsSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
    dataSchema: {
      type: 'object',
      required: ['count'],
      properties: {
        count: SchemaConstants.nonNegInt,
      },
      additionalProperties: false,
    },
  },
  async function getNotifsCount({ currentUserId }) {
    const lastSeenRow = await UserMeta.query()
      .select('metaValue')
      .findOne({
        metaKey: LAST_SEEN_NOTIFS_TIME,
        userId: currentUserId,
      });
    const lastSeenTime = lastSeenRow?.metaValue
      ? toMysqlDateTime(new Date(lastSeenRow.metaValue))
      : 0;
    const count = await countQuery(
      Notif.query()
        .where({
          'notifs.userId': currentUserId,
          'notifs.hasRead': false,
        })
        .where('notifs.time', '>', lastSeenTime),
    );

    return {
      entities: [],
      data: {
        count,
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
      .select('notifs.*')
      .where('notifs.userId', currentUserId);

    let { entities: notifs, data } = await paginateQuery(
      query,
      [
        {
          column: raw('unix_timestamp(notifs.time)'),
          columnWithoutTransforms: 'notifs.time',
          order: 'desc',
        },
        { column: 'notifs.id', order: 'desc' },
      ],
      { limit, cursor },
    );
    await decorateNotifs(notifs);
    notifs = notifs.filter(n => n.extras.content && n.extras.path);

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
      properties: {},
      additionalProperties: false,
    },
  },
  function seenNotifs({ currentUserId }) {
    void UserMeta.query()
      .insert({
        userId: currentUserId,
        metaKey: LAST_SEEN_NOTIFS_TIME,
        metaValue: toMysqlDateTime(new Date()),
      })
      .onConflict(['userId', 'metaKey'])
      .merge()
      .catch(_ => console.error('Failed to update last view notifs time.'));
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
    const notif = await Notif.findOne({ id: notifId });
    if (!notif || notif.userId !== currentUserId) {
      throw new HandledError('Can\'t find notif.', 404);
    }

    await Notif.patch({ id: notifId }, {
      hasRead: true,
    });
    return {
      data: null,
    };
  },
);
