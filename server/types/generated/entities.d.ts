import type _BaseUser from 'models/BaseUser';
import type _Notif from 'models/Notif';
import type _Report from 'models/Report';
import type _UserMeta from 'models/UserMeta';

declare global {
  type BaseUser = _BaseUser;
  type BaseUserModel = typeof _BaseUser;
  type Notif = _Notif;
  type NotifModel = typeof _Notif;
  type Report = _Report;
  type ReportModel = typeof _Report;
  type UserMeta = _UserMeta;
  type UserMetaModel = typeof _UserMeta;
}
  