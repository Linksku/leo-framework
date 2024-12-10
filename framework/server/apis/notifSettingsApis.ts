import { defineApi } from 'services/ApiManager';
import { NOTIF_CHANNELS_ARR, NOTIF_CHANNEL_CONFIGS } from 'config/notifs';
import { verifyJwt } from 'core/jwt';

defineApi(
  {
    name: 'notifSettings',
    auth: true,
    paramsSchema: SchemaConstants.emptyObj,
  },
  async function notifSettingsApi({
    currentUserId,
  }: ApiHandlerParams<'notifSettings'>) {
    const settings = await NotifSettingModel.selectAll({ userId: currentUserId });
    return {
      data: null,
      entities: settings,
    };
  },
);

defineApi(
  {
    method: 'post',
    name: 'updateNotifSettings',
    auth: true,
    paramsSchema: {
      type: 'object',
      required: ['updatedSettings'],
      properties: {
        updatedSettings: {
          type: 'array',
          items: {
            type: 'object',
            required: ['channel'],
            properties: {
              channel: {
                type: 'string',
                enum: NOTIF_CHANNELS_ARR,
                tsType: 'NotifChannel',
              },
              push: { type: 'boolean' },
              email: { type: 'boolean' },
            },
            additionalProperties: false,
          },
        },
      },
      additionalProperties: false,
    },
  },
  async function updateNotifSettingsApi({
    updatedSettings,
    currentUserId,
  }: ApiHandlerParams<'updateNotifSettings'>) {
    const deletes: Promise<NotifSettingModel | null>[] = [];
    const inserts: Promise<NotifSettingModel>[] = [];
    const seen = new Set<NotifChannel>();
    for (const setting of updatedSettings) {
      if (seen.has(setting.channel)) {
        continue;
      }
      seen.add(setting.channel);

      const { defaultSettings } = NOTIF_CHANNEL_CONFIGS[setting.channel];
      if (!defaultSettings) {
        continue;
      } else if ((setting.push == null || setting.push === defaultSettings.push)
        && (setting.email == null || setting.email === defaultSettings.email)) {
        deletes.push(
          NotifSettingModel.deleteOne({
            userId: currentUserId,
            channel: setting.channel,
          }),
        );
      } else {
        inserts.push(
          NotifSettingModel.insertOne(
            {
              userId: currentUserId,
              channel: setting.channel,
              push: setting.push ?? defaultSettings.push,
              email: setting.email ?? defaultSettings.email,
            },
            { onDuplicate: 'update' },
          ),
        );
      }
    }

    const { inserted } = await promiseObj({
      _: Promise.all(deletes),
      inserted: Promise.all(inserts),
    });

    return {
      data: null,
      createdEntities: inserted,
    };
  },
);

defineApi(
  {
    name: 'toggleUnsubEmail',
    method: 'post',
    paramsSchema: {
      type: 'object',
      required: ['type', 'token'],
      properties: {
        type: { type: 'string', enum: ['sub', 'unsub'] },
        token: { type: 'string' },
      },
      additionalProperties: false,
    },
    dataSchema: {
      type: 'object',
      required: ['isSubbed'],
      properties: {
        isSubbed: { type: 'boolean' },
        email: { type: 'string' },
      },
      additionalProperties: false,
    },
  },
  async function toggleUnsubEmailApi({
    type,
    token,
  }: ApiHandlerParams<'toggleUnsubEmail'>) {
    const decoded = await verifyJwt(
      'unsubEmail',
      token,
      payload => typeof payload.email === 'string'
        || (typeof payload.userId === 'number'
          && payload.userId > 0
          && typeof payload.channel === 'string'
          && TS.hasProp(NOTIF_CHANNEL_CONFIGS, payload.channel)),
      { throwErr: true },
    );

    if ('userId' in decoded) {
      if (type === 'sub') {
        await NotifSettingModel.updateOne(
          { userId: decoded.userId, channel: decoded.channel },
          { email: true },
        );
      } else {
        const setting = await NotifSettingModel.selectOne({
          userId: decoded.userId,
          channel: decoded.channel,
        });
        await NotifSettingModel.insertOne(
          {
            userId: decoded.userId,
            channel: decoded.channel,
            push: setting?.push ?? NOTIF_CHANNEL_CONFIGS[decoded.channel].defaultSettings.push,
            email: false,
          },
          { onDuplicate: 'update' },
        );
      }
    } else if (type === 'sub') {
      await UnsubEmailModel.deleteOne({ email: decoded.email });
    } else {
      await UnsubEmailModel.insertOne(
        { email: decoded.email },
        { onDuplicate: 'ignore' },
      );
    }

    return {
      data: {
        isSubbed: type === 'sub',
        email: TS.hasProp(decoded, 'email')
          ? decoded.email
          : await UserModel.selectCol({ id: decoded.userId }, 'email'),
      },
    };
  },
);
