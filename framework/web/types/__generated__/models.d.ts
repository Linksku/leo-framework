// Use EntityTypeToInstance, EntityInstancesMap[ModelType] creates a union of all entities
type EntityInstancesMap = {
  mzTest: BaseEntity & IMzTest;
  mzTestMV: BaseEntity & IMzTestMV;
  user: BaseEntity & IUser;
  userAuth: BaseEntity & IUserAuth;
  userDevice: BaseEntity & IUserDevice;
  userMeta: BaseEntity & IUserMeta;
};
