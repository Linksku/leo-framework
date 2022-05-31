type ReportsCountMV = ReportsCountMVClass['instanceType'];

declare global {
  type EntityType =
    | 'notif'
    | 'report'
    | 'user'
    | 'userMeta';

  type Notif = NotifClass['instanceType'];
  type Report = ReportClass['instanceType'];
  type User = UserClass['instanceType'];
  type UserMeta = UserMetaClass['instanceType'];

  // Use ModelTypeToInstance, ModelInstancesMap[ModelType] creates a union of all models
  type ModelInstancesMap = {
    notif: Notif;
    report: Report;
    reportsCountMV: ReportsCountMV;
    user: User;
    userMeta: UserMeta;
  }

  // Use ModelTypeToClass, ModelClassesMap[ModelType] creates a union of all models
  type ModelClassesMap = {
    notif: NotifClass;
    report: ReportClass;
    reportsCountMV: ReportsCountMVClass;
    user: UserClass;
    userMeta: UserMetaClass;
  }
}

export {};
