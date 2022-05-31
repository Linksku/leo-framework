type Notif = Entity & INotif & {
  relations?: ModelRelationsTypes<'notif'>,
};
type Report = Entity & IReport & {
  relations?: ModelRelationsTypes<'report'>,
};
type ReportsCountMV = Entity & IReportsCountMV & {
  relations?: ModelRelationsTypes<'reportsCountMV'>,
};
type User = Entity & IUser & {
  relations?: ModelRelationsTypes<'user'>,
};
type UserMeta = Entity & IUserMeta & {
  relations?: ModelRelationsTypes<'userMeta'>,
};

// Use EntityTypeToInstance, EntityInstancesMap[ModelType] creates a union of all entities
type EntityInstancesMap = {
  notif: Notif;
  report: Report;
  reportsCountMV: ReportsCountMV;
  user: User;
  userMeta: UserMeta;
}
