// Use EntityTypeToInstance, EntityInstancesMap[ModelType] creates a union of all entities
type EntityInstancesMap = {
  mzTest: BaseEntity & IMzTest;
  mzTestMV: BaseEntity & IMzTestMV;
  notif: BaseEntity & INotif;
  unsubNotif: BaseEntity & IUnsubNotif;
  user: BaseEntity & IUser;
  userAuth: BaseEntity & IUserAuth;
  userDevice: BaseEntity & IUserDevice;
  userMeta: BaseEntity & IUserMeta;
  virtualRenderedNotif: BaseEntity & IVirtualRenderedNotif;
};
