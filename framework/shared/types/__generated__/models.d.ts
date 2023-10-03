interface IMzTest extends IBaseModel {
  id: number;
  version: number;
}

interface IMzTestMV extends IBaseModel {
  id: number;
  version: number;
}

interface IUser extends IBaseModel {
  id: number;
  email: string;
  name: string;
  birthday: string;
}

interface IUserAuth extends IBaseModel {
  id: number;
  userId: number;
  password: string;
  registerTime: Date;
}

interface IUserDevice extends IBaseModel {
  id: number;
  userId: number;
  platform: 'web' | 'android' | 'ios';
  deviceId: string;
  lastSeenTime: Date;
  userAgent: string | null;
  registrationToken: string | null;
}

interface IUserMeta extends IBaseModel {
  id: number;
  userId: number;
  metaKey: string;
  metaValue: string;
}

type ModelType =
  | 'mzTest'
  | 'mzTestMV'
  | 'user'
  | 'userAuth'
  | 'userDevice'
  | 'userMeta';

type RRModelType =
  | 'mzTest'
  | 'mzTestMV'
  | 'user'
  | 'userAuth'
  | 'userDevice'
  | 'userMeta';

type ModelInterfacesMap = {
  mzTest: IMzTest,
  mzTestMV: IMzTestMV,
  user: IUser,
  userAuth: IUserAuth,
  userDevice: IUserDevice,
  userMeta: IUserMeta,
};

type ModelRelationsMap = {
  mzTest: {
  },
  mzTestMV: {
  },
  user: {
    userMeta: {
      modelType: 'userMeta',
      tsType: IUserMeta[],
    },
    userAuth: {
      modelType: 'userAuth',
      tsType: IUserAuth | null,
    },
  },
  userAuth: {
    user: {
      modelType: 'user',
      tsType: IUser,
    },
  },
  userDevice: {
    user: {
      modelType: 'user',
      tsType: IUser,
    },
  },
  userMeta: {
    user: {
      modelType: 'user',
      tsType: IUser,
    },
  },
};
