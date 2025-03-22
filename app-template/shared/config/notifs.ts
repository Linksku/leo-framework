export type NotifScope = 'general';

export const NOTIF_SCOPES = TS.literal({
  GENERAL: 'general',
} as const) satisfies Record<string, NotifScope>;

export type NotifChannel = 'general';

export const NOTIF_CHANNELS = {
  GENERAL: 'general',
} satisfies Record<string, NotifChannel>;

export const NOTIF_CHANNELS_ARR = TS.objValues(NOTIF_CHANNELS);

export const NOTIF_CHANNEL_CONFIGS = {
  general: {
    name: 'General',
    defaultSettings: { push: true, email: false },
    canEmail: false,
  },
} satisfies Record<
  NotifChannel,
  {
    name: string,
    defaultSettings: { push: boolean, email: boolean },
    canEmail: boolean,
  }
>;

export const UNSUB_NOTIF_ENTITIES = TS.literal([
  'user',
] as const);

export type UnsubNotifEntity = typeof UNSUB_NOTIF_ENTITIES[number];

export const NOTIF_SCOPES_ARR = TS.objValues(NOTIF_SCOPES);
