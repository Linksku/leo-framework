export type NotifScope = 'general';

export const NOTIF_SCOPES = TS.literal({
  GENERAL: 'general',
} as const) satisfies Record<string, NotifScope>;

export type NotifChannel = 'general';

export const NOTIF_CHANNELS = {
  GENERAL: 'general',
} satisfies Record<string, NotifChannel>;

export const NOTIF_CHANNEL_NAMES = {
  general: 'General',
} satisfies Record<NotifChannel, string>;

export type UnsubNotifEntity = never;

export const UNSUB_NOTIF_ENTITIES = [] as UnsubNotifEntity[];

export const NOTIF_SCOPES_ARR = TS.objValues(NOTIF_SCOPES);
