import { raw } from 'objection';

import { defineApi } from 'services/ApiManager';
import { LAST_SEEN_NOTIFS_TIME } from 'consts/coreUserMetaKeys';
import paginateQuery from 'lib/paginateQuery';
import { decorateNotifs } from 'services/NotifsManager';
import { toMysqlDateTime } from 'lib/mysqlDate';

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
    const count = await User.query()
      .joinRelated('notifs')
      .leftJoinRelated(`usersMeta(filterMetaKey)`)
      .modifiers({
        filterMetaKey: async query => query.where({ metaKey: LAST_SEEN_NOTIFS_TIME }),
      })
      .where({
        'users.id': currentUserId,
        'notifs.hasRead': false,
      })
      .where(
        'notifs.time',
        '>',
        raw('IF(metaValue is null, FROM_UNIXTIME(0), STR_TO_DATE(metaValue, "%Y-%m-%d %h:%i:%s"))'),
      )
      .resultSize();
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
        cursor: SchemaConstants.id,
      },
      additionalProperties: false,
    },
    dataSchema: SchemaConstants.pagination,
  },
  async function getNotifs({ currentUserId, limit, cursor }) {
    const query = Notif.query()
      .where('notifs.userId', currentUserId);

    let { entities: notifs, data } = await paginateQuery(
      query,
      { limit, cursor, orderColumn: 'time' },
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
  async function seenNotifs({ currentUserId }) {
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
    const notif = await Notif.findOne('id', notifId);
    if (!notif || notif.userId !== currentUserId) {
      throw new HandledError('Can\'t find notif.', 404);
    }

    await Notif.patch('id', notifId, {
      hasRead: true,
    });
    return {
      entities: [
        await Notif.findOne('id', notifId),
      ],
      data: null,
    };
  },
);
