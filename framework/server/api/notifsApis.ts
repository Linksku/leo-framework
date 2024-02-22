import { defineApi } from 'services/ApiManager';
import paginateQuery from 'utils/db/paginateQuery';
import { getRenderedNotifs } from 'services/NotifsManager';
import { NOTIF_SCOPES_ARR, UNSUB_NOTIF_ENTITIES } from 'config/notifs';
import { PLATFORM_TYPES } from 'services/requestContext/RequestContextLocalStorage';

defineApi(
  {
    name: 'notifs',
    auth: true,
    paramsSchema: {
      type: 'object',
      required: ['scope'],
      properties: {
        scope: {
          type: 'string',
          enum: NOTIF_SCOPES_ARR,
          tsType: 'NotifScope',
        },
        limit: SchemaConstants.limit,
        cursor: SchemaConstants.cursor,
      },
      additionalProperties: false,
    },
    dataSchema: SchemaConstants.entitiesPagination,
  },
  async function notifsApi({
    scope,
    limit,
    cursor,
    currentUserId,
  }: ApiHandlerParams<'notifs'>) {
    const query = modelQuery(NotifModel)
      .select(NotifModel.cols.all)
      .where({
        [NotifModel.cols.userId]: currentUserId,
        [NotifModel.cols.scope]: scope,
      });

    let { entities: notifs, data } = await paginateQuery(
      query,
      [
        {
          column: raw(`cast(extract(epoch FROM ${NotifModel.colsQuoted.time}) AS float8)`),
          columnWithoutTransforms: NotifModel.cols.time,
          order: 'desc',
        },
        { column: NotifModel.cols.id, order: 'desc' },
      ],
      { limit, cursor },
    );
    const renderedNotifs = await getRenderedNotifs(notifs);
    notifs = notifs.filter((_, idx) => renderedNotifs[idx]);
    const virtualRenderedNotifs = TS.filterNulls(renderedNotifs)
      .map(notif => VirtualRenderedNotif.create({
        notifId: notif.notifId,
        content: notif.content,
        contentBoldRanges: notif.contentBoldRanges,
        path: notif.path,
      }));

    return {
      entities: [
        ...notifs,
        ...virtualRenderedNotifs,
      ],
      data: {
        ...data,
        items: notifs.map(n => n.id),
      },
    };
  },
);

defineApi(
  {
    name: 'registerPushNotifToken',
    auth: true,
    paramsSchema: {
      type: 'object',
      required: ['platform', 'deviceId', 'registrationToken'],
      properties: {
        // For choosing send mechanism and deduping per platform
        platform: {
          type: 'string',
          enum: PLATFORM_TYPES,
        },
        deviceId: SchemaConstants.content,
        registrationToken: SchemaConstants.content,
      },
      additionalProperties: false,
    },
  },
  async function registerPushNotifTokenApi({
    platform,
    deviceId,
    registrationToken,
    currentUserId,
    userAgent,
  }: ApiHandlerParams<'registerPushNotifToken'>) {
    let userDevices = await UserDeviceModel.selectAll({
      userId: currentUserId,
    });
    userDevices = userDevices.filter(d => d.deviceId !== deviceId);
    if (userDevices.length > 5) {
      userDevices = userDevices.slice();
      userDevices.sort((a, b) => b.lastSeenTime.getTime() - a.lastSeenTime.getTime());
      const oldDevices = userDevices.slice(5);
      await UserDeviceModel.deleteBulk(oldDevices.map(d => ({ id: d.id })));
    }

    await UserDeviceModel.insertOne({
      userId: currentUserId,
      platform,
      deviceId,
      lastSeenTime: new Date(),
      userAgent: userAgent ?? null,
      registrationToken,
    }, { onDuplicate: 'update' });

    return {
      data: null,
    };
  },
);

defineApi(
  {
    name: 'unsubNotif',
    auth: true,
    paramsSchema: {
      type: 'object',
      required: ['entityType', 'entityId'],
      properties: {
        entityType: {
          type: 'string',
          enum: UNSUB_NOTIF_ENTITIES,
          tsType: 'UnsubNotifEntity',
        },
        entityId: SchemaConstants.id,
      },
      additionalProperties: false,
    },
  },
  async function unsubNotifApi({
    entityType,
    entityId,
    currentUserId,
  }: ApiHandlerParams<'unsubNotif'>) {
    const unsub = await UnsubNotifModel.selectOne({
      userId: currentUserId,
      entityType,
      entityId,
    });
    return {
      data: null,
      entities: unsub ? [unsub] : [],
    };
  },
);

defineApi(
  {
    method: 'post',
    name: 'toggleUnsubNotif',
    auth: true,
    paramsSchema: {
      type: 'object',
      required: ['entityType', 'entityId'],
      properties: {
        entityType: {
          type: 'string',
          enum: UNSUB_NOTIF_ENTITIES,
          tsType: 'UnsubNotifEntity',
        },
        entityId: SchemaConstants.id,
      },
      additionalProperties: false,
    },
  },
  async function toggleUnsubNotifApi({
    entityType,
    entityId,
    currentUserId,
  }: ApiHandlerParams<'toggleUnsubNotif'>) {
    const EntityClass = getModelClass<EntityType>(entityType);
    const { entity, unsub } = await promiseObj({
      entity: EntityClass.selectOne({ id: entityId }),
      unsub: UnsubNotifModel.selectOne({
        userId: currentUserId,
        entityType,
        entityId,
      }),
    });
    if (!entity) {
      throw new UserFacingError('Entity not found', 400);
    }

    if (unsub) {
      await UnsubNotifModel.deleteOne({
        userId: currentUserId,
        entityType,
        entityId,
      });
      return {
        data: null,
        deletedIds: {
          unsubNotif: [unsub.id],
        },
      };
    }

    const inserted = await UnsubNotifModel.insertOne({
      userId: currentUserId,
      entityType,
      entityId,
    });
    return {
      data: null,
      createdEntities: [inserted],
    };
  },
);
