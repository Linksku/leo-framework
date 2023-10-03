import Entity from 'services/model/Entity';
import MaterializedView from 'services/model/MaterializedView';
import InputMaterializedView from 'services/model/InputMaterializedView';
import VirtualModel from 'services/model/VirtualModel';



declare global {
class MzTest extends Entity implements IMzTest {
  declare static type: 'mzTest';
  declare static Interface: IMzTest;
  declare static instanceType: MzTest;
  declare static schema: ModelSchema<IMzTest>;
  declare static cols: ModelColsMap<IMzTest>;
  declare static colsQuoted: ModelColsMap<IMzTest>;
  declare static primaryIndex: 'id';

  declare cls: MzTestClass;
  declare relations?: ModelRelationTypes['mzTest'];

  declare id: number;
  declare version: number;
}

type MzTestClass = typeof MzTest;

class MzTestMV extends InputMaterializedView implements IMzTestMV {
  declare static type: 'mzTestMV';
  declare static Interface: IMzTestMV;
  declare static instanceType: MzTestMV;
  declare static schema: ModelSchema<IMzTestMV>;
  declare static cols: ModelColsMap<IMzTestMV>;
  declare static colsQuoted: ModelColsMap<IMzTestMV>;
  declare static primaryIndex: 'id';

  declare cls: MzTestMVClass;
  declare relations?: ModelRelationTypes['mzTestMV'];

  declare id: number;
  declare version: number;
}

type MzTestMVClass = typeof MzTestMV;

class User extends Entity implements IUser {
  declare static type: 'user';
  declare static Interface: IUser;
  declare static instanceType: User;
  declare static schema: ModelSchema<IUser>;
  declare static cols: ModelColsMap<IUser>;
  declare static colsQuoted: ModelColsMap<IUser>;
  declare static primaryIndex: 'id';

  declare cls: UserClass;
  declare relations?: ModelRelationTypes['user'];

  declare id: number;
  declare email: string;
  declare name: string;
  declare birthday: string;
}

type UserClass = typeof User;

class UserAuth extends Entity implements IUserAuth {
  declare static type: 'userAuth';
  declare static Interface: IUserAuth;
  declare static instanceType: UserAuth;
  declare static schema: ModelSchema<IUserAuth>;
  declare static cols: ModelColsMap<IUserAuth>;
  declare static colsQuoted: ModelColsMap<IUserAuth>;
  declare static primaryIndex: 'id';

  declare cls: UserAuthClass;
  declare relations?: ModelRelationTypes['userAuth'];

  declare id: number;
  declare userId: number;
  declare password: string;
  declare registerTime: Date;
}

type UserAuthClass = typeof UserAuth;

class UserDevice extends Entity implements IUserDevice {
  declare static type: 'userDevice';
  declare static Interface: IUserDevice;
  declare static instanceType: UserDevice;
  declare static schema: ModelSchema<IUserDevice>;
  declare static cols: ModelColsMap<IUserDevice>;
  declare static colsQuoted: ModelColsMap<IUserDevice>;
  declare static primaryIndex: 'id';

  declare cls: UserDeviceClass;
  declare relations?: ModelRelationTypes['userDevice'];

  declare id: number;
  declare userId: number;
  declare platform: 'web' | 'android' | 'ios';
  declare deviceId: string;
  declare lastSeenTime: Date;
  declare userAgent: string | null;
  declare registrationToken: string | null;
}

type UserDeviceClass = typeof UserDevice;

class UserMeta extends Entity implements IUserMeta {
  declare static type: 'userMeta';
  declare static Interface: IUserMeta;
  declare static instanceType: UserMeta;
  declare static schema: ModelSchema<IUserMeta>;
  declare static cols: ModelColsMap<IUserMeta>;
  declare static colsQuoted: ModelColsMap<IUserMeta>;
  declare static primaryIndex: 'id';

  declare cls: UserMetaClass;
  declare relations?: ModelRelationTypes['userMeta'];

  declare id: number;
  declare userId: number;
  declare metaKey: string;
  declare metaValue: string;
}

type UserMetaClass = typeof UserMeta;

type EntityType =
  | 'mzTest'
  | 'user'
  | 'userAuth'
  | 'userDevice'
  | 'userMeta';

// Use ModelTypeToInstance, ModelInstancesMap[ModelType] creates a union of all models
type ModelInstancesMap = {
  mzTest: MzTest;
  mzTestMV: MzTestMV;
  user: User;
  userAuth: UserAuth;
  userDevice: UserDevice;
  userMeta: UserMeta;
};

// Use ModelTypeToClass, ModelClassesMap[ModelType] creates a union of all models
type ModelClassesMap = {
  mzTest: MzTestClass;
  mzTestMV: MzTestMVClass;
  user: UserClass;
  userAuth: UserAuthClass;
  userDevice: UserDeviceClass;
  userMeta: UserMetaClass;
};
}
