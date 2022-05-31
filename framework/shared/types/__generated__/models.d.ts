interface INotif extends IBaseModel {
  id: number;
  version: number;
  notifType: string;
  userId: number;
  groupingId: number;
  time: Date;
  params: Pojo;
  hasRead: boolean;
};

interface IReport extends IBaseModel {
  id: number;
  version: number;
  reporterId: number;
  entityType: 'post';
  entityId: number;
  time: Date;
};

interface IReportsCountMV extends IBaseModel {
  entityType: 'post';
  entityId: number;
  count: number;
};

interface IUser extends IBaseModel {
  id: number;
  version: number;
  email: string;
  password: string;
  name: string;
  birthday: string;
  registerTime: Date;
};

interface IUserMeta extends IBaseModel {
  id: number;
  version: number;
  userId: number;
  metaKey: string;
  metaValue: string;
};

type ModelType =
  | 'notif'
  | 'report'
  | 'reportsCountMV'
  | 'user'
  | 'userMeta';

type ModelInterfacesMap = {
  notif: INotif,
  report: IReport,
  reportsCountMV: IReportsCountMV,
  user: IUser,
  userMeta: IUserMeta,
};

type ModelRelationsMap = {
  notif: {
  },
  report: {
    reporter: {
      modelType: 'user',
      tsType: User,
    },
  },
  reportsCountMV: {
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
}
