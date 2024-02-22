import type {
  NotifScope as _NotifScope,
  UnsubNotifEntity as _UnsubNotifEntity,
} from 'config/notifs';

declare global {
  declare type OSType =
    | 'android'
    | 'ios'
    | 'mobile'
    | 'windows'
    | 'osx'
    | 'linux'
    | 'other'
    | 'unknown';

  declare type PlatformType =
    | 'desktop-web'
    | 'android-web'
    | 'android-standalone'
    | 'android-native'
    | 'ios-web'
    | 'ios-standalone'
    | 'ios-native'
    | 'other-web'
    | 'other-standalone'
    | 'other-native';

  declare type NotifScope = _NotifScope;

  declare type UnsubNotifEntity = _UnsubNotifEntity;
}
