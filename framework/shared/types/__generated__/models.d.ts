interface IMzTest extends IBaseModel {
  id: number;
  version: number;
}

interface IMzTestMV extends IBaseModel {
  id: number;
  version: number;
}

interface INotif extends IBaseModel {
  id: number;
  notifType: string;
  userId: number;
  groupingId: number;
  time: Date;
  params: JsonObj;
  hasRead: boolean;
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

interface IUserMeta extends IBaseModel {
  id: number;
  userId: number;
  metaKey: string;
  metaValue: string;
}

type ModelType =
  | 'mzTest'
  | 'mzTestMV'
  | 'notif'
  | 'user'
  | 'userAuth'
  | 'userMeta';

type ModelInterfacesMap = {
  mzTest: IMzTest,
  mzTestMV: IMzTestMV,
  notif: INotif,
  user: IUser,
  userAuth: IUserAuth,
  userMeta: IUserMeta,
};

type ModelRelationsMap = {
  mzTest: {
  },
  mzTestMV: {
  },
  notif: {
  },
  user: {
    userMeta: {
      modelType: 'userMeta',
      tsType: UserMeta[],
    },
    userAuth: {
      modelType: 'userAuth',
      tsType: UserAuth | null,
    },
    notifs: {
      modelType: 'notif',
      tsType: Notif[],
    },
  },
  userAuth: {
    user: {
      modelType: 'user',
      tsType: User,
    },
  },
  userMeta: {
    user: {
      modelType: 'user',
      tsType: User,
    },
  },
};
