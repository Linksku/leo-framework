interface INotif {
  id: number;
  version: number;
  notifType: string;
  userId: number;
  groupingId: number;
  time: Date;
  params: Pojo;
  hasRead: boolean;
};

interface INotifBT {
  id: number;
  version: number;
  notifType: string;
  userId: number;
  groupingId: number;
  time: Date;
  params: Pojo;
  hasRead: boolean;
};

interface IReport {
  id: number;
  version: number;
  reporterId: number;
  entityType: 'post';
  entityId: number;
  time: Date;
};

interface IReportBT {
  id: number;
  version: number;
  reporterId: number;
  entityType: 'post';
  entityId: number;
  time: Date;
};

interface IUser {
  id: number;
  version: number;
  email: string;
  password: string;
  name: string;
  birthday: string;
  registerTime: Date;
};

interface IUserBT {
  id: number;
  version: number;
  email: string;
  password: string;
  name: string;
  birthday: string;
  registerTime: Date;
};

interface IUserMeta {
  id: number;
  version: number;
  userId: number;
  metaKey: string;
  metaValue: string;
};

interface IUserMetaBT {
  id: number;
  version: number;
  userId: number;
  metaKey: string;
  metaValue: string;
};

type ModelType =
  | 'notif'
  | 'notifBT'
  | 'report'
  | 'reportBT'
  | 'user'
  | 'userBT'
  | 'userMeta'
  | 'userMetaBT';

type ModelInterfacesMap = {
  notif: INotif,
  notifBT: INotifBT,
  report: IReport,
  reportBT: IReportBT,
  user: IUser,
  userBT: IUserBT,
  userMeta: IUserMeta,
  userMetaBT: IUserMetaBT,
};
