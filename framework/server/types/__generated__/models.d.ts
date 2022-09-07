

declare global {
  type EntityType =
    | 'notif'
    | 'user'
    | 'userMeta';

  type Notif = NotifClass['instanceType'];
  type User = UserClass['instanceType'];
  type UserMeta = UserMetaClass['instanceType'];

  // Use ModelTypeToInstance, ModelInstancesMap[ModelType] creates a union of all models
  type ModelInstancesMap = {
    notif: Notif;
    user: User;
    userMeta: UserMeta;
  };

  // Use ModelTypeToClass, ModelClassesMap[ModelType] creates a union of all models
  type ModelClassesMap = {
    notif: NotifClass;
    user: UserClass;
    userMeta: UserMetaClass;
  };
}

export {};
