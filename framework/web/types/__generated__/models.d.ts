type Notif = Entity & INotif;
type User = Entity & IUser;
type UserMeta = Entity & IUserMeta;

// Use EntityTypeToInstance, EntityInstancesMap[ModelType] creates a union of all entities
type EntityInstancesMap = {
  notif: Notif;
  user: User;
  userMeta: UserMeta;
};
