interface INotif extends IBaseModel {
  id: number;
  version: number;
  notifType: string;
  userId: number;
  groupingId: number;
  time: Date;
  params: JsonObj;
  hasRead: boolean;
}

interface IUser extends IBaseModel {
  id: number;
  version: number;
  email: string;
  password: string;
  name: string;
  birthday: string;
  registerTime: Date;
}

interface IUserMeta extends IBaseModel {
  id: number;
  version: number;
  userId: number;
  metaKey: string;
  metaValue: string;
}

type ModelType =
  | 'notif'
  | 'user'
  | 'userMeta';

type ModelInterfacesMap = {
  notif: INotif,
  user: IUser,
  userMeta: IUserMeta,
};

type ModelRelationsMap = {
  notif: {
  },
  user: {
    userMeta: {
      modelType: 'userMeta',
      tsType: UserMeta[],
    },
    notifs: {
      modelType: 'notif',
      tsType: Notif[],
    },
  },
  userMeta: {
    user: {
      modelType: 'user',
      tsType: User,
    },
  },
};
