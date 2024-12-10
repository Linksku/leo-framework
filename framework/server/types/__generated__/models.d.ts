import Entity from 'core/models/Entity';
import MaterializedView from 'core/models/MaterializedView';
import VirtualModel from 'core/models/VirtualModel';



declare global {
class FtueSeenTimeModel extends Entity implements IFtueSeenTime {
  declare static type: 'ftueSeenTime';
  declare static Interface: IFtueSeenTime;
  declare static instanceType: FtueSeenTimeModel;
  declare static schema: ModelSchema<IFtueSeenTime>;
  declare static cols: ModelColsMap<'ftueSeenTime'>;
  declare static colsQuoted: ModelColsMap<'ftueSeenTime'>;
  declare static primaryIndex: 'id';
  declare static uniqueIndexes: [
    'id',
    ['userId', 'ftueType'],
  ];
  declare static requiredCols: ['id', 'userId', 'ftueType'];

  declare cls: FtueSeenTimeClass;
  declare relations?: ModelRelationTypes['ftueSeenTime'];

  declare id: number;
  declare userId: number;
  declare ftueType: string;
  declare time: Date;
}

type FtueSeenTimeClass = typeof FtueSeenTimeModel;

class MzTestModel extends Entity implements IMzTest {
  declare static type: 'mzTest';
  declare static Interface: IMzTest;
  declare static instanceType: MzTestModel;
  declare static schema: ModelSchema<IMzTest>;
  declare static cols: ModelColsMap<'mzTest'>;
  declare static colsQuoted: ModelColsMap<'mzTest'>;
  declare static primaryIndex: 'id';
  declare static uniqueIndexes: [
    'id',
  ];
  declare static requiredCols: ['id'];

  declare cls: MzTestClass;
  declare relations?: ModelRelationTypes['mzTest'];

  declare id: number;
  declare version: number;
}

type MzTestClass = typeof MzTestModel;

class MzTestMV extends MaterializedView implements IMzTestMV {
  declare static type: 'mzTestMV';
  declare static Interface: IMzTestMV;
  declare static instanceType: MzTestMV;
  declare static schema: ModelSchema<IMzTestMV>;
  declare static cols: ModelColsMap<'mzTestMV'>;
  declare static colsQuoted: ModelColsMap<'mzTestMV'>;
  declare static primaryIndex: 'id';
  declare static uniqueIndexes: [
    'id',
  ];
  declare static requiredCols: ['id', 'version'];

  declare cls: MzTestMVClass;
  declare relations?: ModelRelationTypes['mzTestMV'];

  declare id: number;
  declare version: number;
}

type MzTestMVClass = typeof MzTestMV;

class NotifModel extends Entity implements INotif {
  declare static type: 'notif';
  declare static Interface: INotif;
  declare static instanceType: NotifModel;
  declare static schema: ModelSchema<INotif>;
  declare static cols: ModelColsMap<'notif'>;
  declare static colsQuoted: ModelColsMap<'notif'>;
  declare static primaryIndex: 'id';
  declare static uniqueIndexes: [
    'id',
    ['notifType', 'userId', 'groupingId'],
  ];
  declare static requiredCols: ['id', 'scope', 'notifType', 'userId', 'groupingId'];

  declare cls: NotifClass;
  declare relations?: ModelRelationTypes['notif'];

  declare id: number;
  declare scope: NotifScope;
  declare notifType: string;
  declare userId: number;
  declare groupingId: number;
  declare time: Date;
  declare params: JsonObj;
  declare hasRead: boolean;
}

type NotifClass = typeof NotifModel;

class NotifSettingModel extends Entity implements INotifSetting {
  declare static type: 'notifSetting';
  declare static Interface: INotifSetting;
  declare static instanceType: NotifSettingModel;
  declare static schema: ModelSchema<INotifSetting>;
  declare static cols: ModelColsMap<'notifSetting'>;
  declare static colsQuoted: ModelColsMap<'notifSetting'>;
  declare static primaryIndex: 'id';
  declare static uniqueIndexes: [
    'id',
    ['userId', 'channel'],
  ];
  declare static requiredCols: ['id', 'userId', 'channel', 'push', 'email'];

  declare cls: NotifSettingClass;
  declare relations?: ModelRelationTypes['notifSetting'];

  declare id: number;
  declare userId: number;
  declare channel: NotifChannel;
  declare push: boolean;
  declare email: boolean;
}

type NotifSettingClass = typeof NotifSettingModel;

class UnsubEmailModel extends Entity implements IUnsubEmail {
  declare static type: 'unsubEmail';
  declare static Interface: IUnsubEmail;
  declare static instanceType: UnsubEmailModel;
  declare static schema: ModelSchema<IUnsubEmail>;
  declare static cols: ModelColsMap<'unsubEmail'>;
  declare static colsQuoted: ModelColsMap<'unsubEmail'>;
  declare static primaryIndex: 'id';
  declare static uniqueIndexes: [
    'id',
    'email',
  ];
  declare static requiredCols: ['id', 'email'];

  declare cls: UnsubEmailClass;
  declare relations?: ModelRelationTypes['unsubEmail'];

  declare id: number;
  declare email: string;
  declare time: Date;
}

type UnsubEmailClass = typeof UnsubEmailModel;

class UnsubNotifModel extends Entity implements IUnsubNotif {
  declare static type: 'unsubNotif';
  declare static Interface: IUnsubNotif;
  declare static instanceType: UnsubNotifModel;
  declare static schema: ModelSchema<IUnsubNotif>;
  declare static cols: ModelColsMap<'unsubNotif'>;
  declare static colsQuoted: ModelColsMap<'unsubNotif'>;
  declare static primaryIndex: 'id';
  declare static uniqueIndexes: [
    'id',
    ['entityType', 'entityId', 'userId'],
  ];
  declare static requiredCols: ['id', 'userId', 'entityType', 'entityId'];

  declare cls: UnsubNotifClass;
  declare relations?: ModelRelationTypes['unsubNotif'];

  declare id: number;
  declare userId: number;
  declare entityType: UnsubNotifEntity;
  declare entityId: number;
  declare time: Date;
}

type UnsubNotifClass = typeof UnsubNotifModel;

class UserModel extends Entity implements IUser {
  declare static type: 'user';
  declare static Interface: IUser;
  declare static instanceType: UserModel;
  declare static schema: ModelSchema<IUser>;
  declare static cols: ModelColsMap<'user'>;
  declare static colsQuoted: ModelColsMap<'user'>;
  declare static primaryIndex: 'id';
  declare static uniqueIndexes: [
    'id',
    'email',
  ];
  declare static requiredCols: ['id', 'email', 'name'];

  declare cls: UserClass;
  declare relations?: ModelRelationTypes['user'];

  declare id: number;
  declare isDeleted: boolean;
  declare role: number;
  declare email: string;
  declare name: string;
  declare birthday: string | null;
}

type UserClass = typeof UserModel;

class UserAuthModel extends Entity implements IUserAuth {
  declare static type: 'userAuth';
  declare static Interface: IUserAuth;
  declare static instanceType: UserAuthModel;
  declare static schema: ModelSchema<IUserAuth>;
  declare static cols: ModelColsMap<'userAuth'>;
  declare static colsQuoted: ModelColsMap<'userAuth'>;
  declare static primaryIndex: 'id';
  declare static uniqueIndexes: [
    'id',
    'userId',
  ];
  declare static requiredCols: ['id', 'userId'];

  declare cls: UserAuthClass;
  declare relations?: ModelRelationTypes['userAuth'];

  declare id: number;
  declare userId: number;
  declare isDeleted: boolean;
  declare password: string | null;
  declare registerTime: Date;
  declare isEmailVerified: boolean;
}

type UserAuthClass = typeof UserAuthModel;

class UserDeviceModel extends Entity implements IUserDevice {
  declare static type: 'userDevice';
  declare static Interface: IUserDevice;
  declare static instanceType: UserDeviceModel;
  declare static schema: ModelSchema<IUserDevice>;
  declare static cols: ModelColsMap<'userDevice'>;
  declare static colsQuoted: ModelColsMap<'userDevice'>;
  declare static primaryIndex: 'id';
  declare static uniqueIndexes: [
    'id',
    ['userId', 'deviceId'],
  ];
  declare static requiredCols: ['id', 'userId', 'platform', 'deviceId'];

  declare cls: UserDeviceClass;
  declare relations?: ModelRelationTypes['userDevice'];

  declare id: number;
  declare userId: number;
  declare platform: string;
  declare deviceId: string;
  declare lastSeenTime: Date;
  declare userAgent: string | null;
  declare registrationToken: string | null;
}

type UserDeviceClass = typeof UserDeviceModel;

class UserMetaModel extends Entity implements IUserMeta {
  declare static type: 'userMeta';
  declare static Interface: IUserMeta;
  declare static instanceType: UserMetaModel;
  declare static schema: ModelSchema<IUserMeta>;
  declare static cols: ModelColsMap<'userMeta'>;
  declare static colsQuoted: ModelColsMap<'userMeta'>;
  declare static primaryIndex: 'id';
  declare static uniqueIndexes: [
    'id',
    ['userId', 'metaKey'],
  ];
  declare static requiredCols: ['id', 'userId', 'metaKey', 'metaValue'];

  declare cls: UserMetaClass;
  declare relations?: ModelRelationTypes['userMeta'];

  declare id: number;
  declare userId: number;
  declare metaKey: string;
  declare metaValue: string;
}

type UserMetaClass = typeof UserMetaModel;

class VirtualRenderedNotif extends VirtualModel implements IVirtualRenderedNotif {
  declare static type: 'virtualRenderedNotif';
  declare static Interface: IVirtualRenderedNotif;
  declare static instanceType: VirtualRenderedNotif;
  declare static schema: ModelSchema<IVirtualRenderedNotif>;
  declare static cols: ModelColsMap<'virtualRenderedNotif'>;
  declare static colsQuoted: ModelColsMap<'virtualRenderedNotif'>;
  declare static primaryIndex: 'notifId';
  declare static uniqueIndexes: [
    'notifId',
  ];
  declare static requiredCols: ['notifId', 'content', 'contentBoldRanges', 'path'];

  declare cls: VirtualRenderedNotifClass;
  declare relations?: ModelRelationTypes['virtualRenderedNotif'];

  declare notifId: number;
  declare content: string;
  declare contentBoldRanges: [number, number][];
  declare path: string;
}

type VirtualRenderedNotifClass = typeof VirtualRenderedNotif;

type EntityType =
  | 'ftueSeenTime'
  | 'mzTest'
  | 'notif'
  | 'notifSetting'
  | 'unsubEmail'
  | 'unsubNotif'
  | 'user'
  | 'userAuth'
  | 'userDevice'
  | 'userMeta';

// Use ModelTypeToInstance, ModelInstancesMap[ModelType] creates a union of all models
type ModelInstancesMap = {
  ftueSeenTime: FtueSeenTimeModel;
  mzTest: MzTestModel;
  mzTestMV: MzTestMV;
  notif: NotifModel;
  notifSetting: NotifSettingModel;
  unsubEmail: UnsubEmailModel;
  unsubNotif: UnsubNotifModel;
  user: UserModel;
  userAuth: UserAuthModel;
  userDevice: UserDeviceModel;
  userMeta: UserMetaModel;
  virtualRenderedNotif: VirtualRenderedNotif;
};

// Use ModelTypeToClass, ModelClassesMap[ModelType] creates a union of all models
type ModelClassesMap = {
  ftueSeenTime: FtueSeenTimeClass;
  mzTest: MzTestClass;
  mzTestMV: MzTestMVClass;
  notif: NotifClass;
  notifSetting: NotifSettingClass;
  unsubEmail: UnsubEmailClass;
  unsubNotif: UnsubNotifClass;
  user: UserClass;
  userAuth: UserAuthClass;
  userDevice: UserDeviceClass;
  userMeta: UserMetaClass;
  virtualRenderedNotif: VirtualRenderedNotifClass;
};
}
