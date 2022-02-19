type EntityType =
  | 'notif'
  | 'notifBT'
  | 'report'
  | 'reportBT'
  | 'user'
  | 'userBT'
  | 'userMeta'
  | 'userMetaBT';

type Notif = Entity & INotif;
type NotifBT = Entity & INotifBT;
type Report = Entity & IReport;
type ReportBT = Entity & IReportBT;
type User = Entity & IUser;
type UserBT = Entity & IUserBT;
type UserMeta = Entity & IUserMeta;
type UserMetaBT = Entity & IUserMetaBT;

// Use EntityTypeToInstance, EntityInstancesMap[ModelType] creates a union of all entities
type EntityInstancesMap = {
  notif: Notif;
  notifBT: NotifBT;
  report: Report;
  reportBT: ReportBT;
  user: User;
  userBT: UserBT;
  userMeta: UserMeta;
  userMetaBT: UserMetaBT;
}
