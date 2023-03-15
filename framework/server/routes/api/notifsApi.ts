import { defineApi } from 'services/ApiManager';
import paginateQuery from 'utils/db/paginateQuery';
import { decorateNotifs } from 'services/NotifsManager';

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
    dataSchema: SchemaConstants.entitiesPagination,
  },
  async function notifsApi({ currentUserId, limit, cursor }: ApiHandlerParams<'notifs'>) {
    const query = modelQuery(Notif)
      .select(Notif.cols.all)
      .where(Notif.cols.userId, currentUserId)
      .whereNot(Notif.cols.notifType, 'chatReplyCreated');

    let { entities: notifs, data } = await paginateQuery(
      query,
      [
        {
          column: raw(`cast(extract(epoch FROM ${Notif.colsQuoted.time}) AS float8)`),
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
      data: {
        ...data,
        items: notifs.map(n => n.id),
      },
    };
  },
);
