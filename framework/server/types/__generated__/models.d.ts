declare global {
  type EntityType =
    | 'mzTest'
    | 'notif'
    | 'user'
    | 'userAuth'
    | 'userDevice'
    | 'userMeta';

  // Use ModelTypeToInstance, ModelInstancesMap[ModelType] creates a union of all models
  type ModelInstancesMap = {
    mzTest: MzTest;
    mzTestMV: MzTestMV;
    notif: Notif;
    user: User;
    userAuth: UserAuth;
    userDevice: UserDevice;
    userMeta: UserMeta;
  };

  // Use ModelTypeToClass, ModelClassesMap[ModelType] creates a union of all models
  type ModelClassesMap = {
    mzTest: MzTestClass;
    mzTestMV: MzTestMVClass;
    notif: NotifClass;
    user: UserClass;
    userAuth: UserAuthClass;
    userDevice: UserDeviceClass;
    userMeta: UserMetaClass;
  };
}

export {};
