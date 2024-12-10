interface IFtueSeenTime extends IBaseModel {
  id: number;
  userId: number;
  ftueType: string;
  time: Date;
}

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
  scope: NotifScope;
  notifType: string;
  userId: number;
  groupingId: number;
  time: Date;
  params: JsonObj;
  hasRead: boolean;
}

interface INotifSetting extends IBaseModel {
  id: number;
  userId: number;
  channel: NotifChannel;
  push: boolean;
  email: boolean;
}

interface IUnsubEmail extends IBaseModel {
  id: number;
  email: string;
  time: Date;
}

interface IUnsubNotif extends IBaseModel {
  id: number;
  userId: number;
  entityType: UnsubNotifEntity;
  entityId: number;
  time: Date;
}

interface IUser extends IBaseModel {
  id: number;
  isDeleted: boolean;
  role: number;
  email: string;
  name: string;
  birthday: string | null;
}

interface IUserAuth extends IBaseModel {
  id: number;
  userId: number;
  isDeleted: boolean;
  password: string | null;
  registerTime: Date;
  isEmailVerified: boolean;
}

interface IUserDevice extends IBaseModel {
  id: number;
  userId: number;
  platform: string;
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

interface IVirtualRenderedNotif extends IBaseModel {
  notifId: number;
  content: string;
  contentBoldRanges: [number, number][];
  path: string;
}

type ModelType =
  | 'ftueSeenTime'
  | 'mzTest'
  | 'mzTestMV'
  | 'notif'
  | 'notifSetting'
  | 'unsubEmail'
  | 'unsubNotif'
  | 'user'
  | 'userAuth'
  | 'userDevice'
  | 'userMeta'
  | 'virtualRenderedNotif';

type RRModelType =
  | 'ftueSeenTime'
  | 'mzTest'
  | 'mzTestMV'
  | 'notif'
  | 'notifSetting'
  | 'unsubEmail'
  | 'unsubNotif'
  | 'user'
  | 'userAuth'
  | 'userDevice'
  | 'userMeta'
  | 'virtualRenderedNotif';

type ModelInterfacesMap = {
  ftueSeenTime: IFtueSeenTime,
  mzTest: IMzTest,
  mzTestMV: IMzTestMV,
  notif: INotif,
  notifSetting: INotifSetting,
  unsubEmail: IUnsubEmail,
  unsubNotif: IUnsubNotif,
  user: IUser,
  userAuth: IUserAuth,
  userDevice: IUserDevice,
  userMeta: IUserMeta,
  virtualRenderedNotif: IVirtualRenderedNotif,
};

type ModelRelationsMap = {
  ftueSeenTime: {
    user: {
      modelType: 'user',
      tsType: IUser,
    },
  },
  mzTest: {
  },
  mzTestMV: {
  },
  notif: {
  },
  notifSetting: {
  },
  unsubEmail: {
  },
  unsubNotif: {
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
  virtualRenderedNotif: {
  },
};
