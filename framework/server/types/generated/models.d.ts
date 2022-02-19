import type _Notif from '../../models/Notif/Notif';
import type _NotifBT from '../../models/Notif/NotifBT';
import type _Report from '../../models/Report/Report';
import type _ReportBT from '../../models/Report/ReportBT';
import type _User from '../../models/User/User';
import type _UserBT from '../../models/User/UserBT';
import type _UserMeta from '../../models/UserMeta/UserMeta';
import type _UserMetaBT from '../../models/UserMeta/UserMetaBT';

declare global {
  type EntityType =
    | 'notif'
    | 'notifBT'
    | 'report'
    | 'reportBT'
    | 'user'
    | 'userBT'
    | 'userMeta'
    | 'userMetaBT';

  type CacheType =
    | '';

  type NotifClass = typeof _Notif;
  type Notif = InstanceType<NotifClass>;
  type NotifBTClass = typeof _NotifBT;
  type NotifBT = InstanceType<NotifBTClass>;
  type ReportClass = typeof _Report;
  type Report = InstanceType<ReportClass>;
  type ReportBTClass = typeof _ReportBT;
  type ReportBT = InstanceType<ReportBTClass>;
  type UserClass = typeof _User;
  type User = InstanceType<UserClass>;
  type UserBTClass = typeof _UserBT;
  type UserBT = InstanceType<UserBTClass>;
  type UserMetaClass = typeof _UserMeta;
  type UserMeta = InstanceType<UserMetaClass>;
  type UserMetaBTClass = typeof _UserMetaBT;
  type UserMetaBT = InstanceType<UserMetaBTClass>;

  // Use ModelTypeToInstance, ModelInstancesMap[ModelType] creates a union of all models
  type ModelInstancesMap = {
    notif: Notif;
    notifBT: NotifBT;
    report: Report;
    reportBT: ReportBT;
    user: User;
    userBT: UserBT;
    userMeta: UserMeta;
    userMetaBT: UserMetaBT;
  }

  // Use ModelTypeToClass, ModelClassesMap[ModelType] creates a union of all models
  type ModelClassesMap = {
    notif: NotifClass;
    notifBT: NotifBTClass;
    report: ReportClass;
    reportBT: ReportBTClass;
    user: UserClass;
    userBT: UserBTClass;
    userMeta: UserMetaClass;
    userMetaBT: UserMetaBTClass;
  }
}
