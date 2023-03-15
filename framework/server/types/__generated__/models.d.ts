declare global {
  type EntityType =
    | 'mzTest'
    | 'notif'
    | 'user'
    | 'userAuth'
    | 'userMeta';

  // Use ModelTypeToInstance, ModelInstancesMap[ModelType] creates a union of all models
  type ModelInstancesMap = {
    mzTest: MzTest;
    mzTestMV: MzTestMV;
    notif: Notif;
    user: User;
    userAuth: UserAuth;
    userMeta: UserMeta;
  };

  // Use ModelTypeToClass, ModelClassesMap[ModelType] creates a union of all models
  type ModelClassesMap = {
    mzTest: MzTestClass;
    mzTestMV: MzTestMVClass;
    notif: NotifClass;
    user: UserClass;
    userAuth: UserAuthClass;
    userMeta: UserMetaClass;
  };
}

export {};
