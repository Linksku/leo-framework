import { defineApi } from 'services/ApiManager';
import { LAST_SEEN_NOTIFS_TIME } from 'consts/coreUserMetaKeys';
import { toDbDateTime } from 'utils/db/dbDate';
import { NOTIF_SCOPES_ARR } from 'config/notifs';
import toDbValues from 'utils/db/toDbValues';

defineApi(
  {
    name: 'unseenNotifIds',
    auth: true,
    paramsSchema: SchemaConstants.emptyObj,
    dataSchema: {
      type: 'object',
      required: ['notifIds'],
      properties: {
        notifIds: {
          type: 'object',
          patternProperties: {
            '^.*$': SchemaConstants.idArr,
          },
          tsType: 'Partial<Record<NotifScope, number[]>>',
        },
      },
      additionalProperties: false,
    },
  },
  async function unseenNotifIdsApi({ currentUserId }: ApiHandlerParams<'unseenNotifIds'>) {
    const lastSeenTimes = await UserMetaModel.selectBulk(
      NOTIF_SCOPES_ARR.map(scope => ({
        userId: currentUserId,
        metaKey: `${LAST_SEEN_NOTIFS_TIME}:${scope}`,
      })),
      { keepNulls: true },
    );

    const notifs = await entityQuery(NotifModel)
      .select([
        NotifModel.cols.id,
        raw('"allScopes".scope AS scope'),
      ])
      .from(toDbValues(
        {
          scope: {
            rows: NOTIF_SCOPES_ARR,
            dataType: 'text',
          },
          lastSeenTime: {
            rows: lastSeenTimes.map(row => toDbDateTime(new Date(row?.metaValue ?? 0))),
            dataType: 'timestamp',
          },
        },
        'allScopes',
      ))
      .joinLateral(
        entityQuery(NotifModel)
          .select([
            NotifModel.cols.id,
            NotifModel.cols.scope,
          ])
          .where({
            [NotifModel.cols.userId]: currentUserId,
            [NotifModel.cols.hasRead]: false,
            [NotifModel.cols.scope]: raw('"allScopes".scope'),
          })
          .where(
            NotifModel.cols.time,
            '>',
            raw('"allScopes"."lastSeenTime"'),
          )
          .orderBy(NotifModel.cols.time, 'desc', 'last')
          .limit(9)
          .as(NotifModel.tableName),
      );

    const notifIds: ObjectOf<EntityId[]> = Object.create(null);
    for (const notif of notifs) {
      const arr = TS.objValOrSetDefault(notifIds, notif.scope, []);
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
    method: 'post',
    name: 'seenNotifs',
    auth: true,
    paramsSchema: {
      type: 'object',
      required: ['scopes'],
      properties: {
        scopes: {
          type: 'array',
          items: {
            type: 'string',
            enum: NOTIF_SCOPES_ARR,
          },
        },
      },
      additionalProperties: false,
    },
  },
  async function seenNotifsApi({
    scopes,
    currentUserId,
  }: ApiHandlerParams<'seenNotifs'>) {
    try {
      await UserMetaModel.insertBulk(
        scopes.map(scope => ({
          userId: currentUserId,
          metaKey: `${LAST_SEEN_NOTIFS_TIME}:${scope}`,
          metaValue: toDbDateTime(Date.now()),
        })),
        { onDuplicate: 'update' },
      );
    } catch (err) {
      ErrorLogger.warn(getErr(err, { ctx: 'seenNotifsApi' }));
    }
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
  async function readNotifApi({ notifId, currentUserId }: ApiHandlerParams<'readNotif'>) {
    const notif = await NotifModel.selectOne({ id: notifId });
    if (!notif || notif.userId !== currentUserId) {
      throw new UserFacingError('Can\'t find notif.', 404);
    }

    await NotifModel.updateOne({ id: notifId }, {
      hasRead: true,
    });
    return {
      data: null,
    };
  },
);
