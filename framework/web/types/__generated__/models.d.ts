type MzTest = Entity & IMzTest;
type MzTestMV = Entity & IMzTestMV;
type Notif = Entity & INotif;
type User = Entity & IUser;
type UserAuth = Entity & IUserAuth;
type UserDevice = Entity & IUserDevice;
type UserMeta = Entity & IUserMeta;

// Use EntityTypeToInstance, EntityInstancesMap[ModelType] creates a union of all entities
type EntityInstancesMap = {
  mzTest: MzTest;
  mzTestMV: MzTestMV;
  notif: Notif;
  user: User;
  userAuth: UserAuth;
  userDevice: UserDevice;
  userMeta: UserMeta;
};
