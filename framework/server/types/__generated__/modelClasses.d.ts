import Entity from 'services/model/Entity';
import MaterializedView from 'services/model/MaterializedView';
import InputMaterializedView from 'services/model/InputMaterializedView';

declare global {
  declare class MzTest extends Entity implements IMzTest {
    declare static type: 'mzTest';
    declare static Interface: IMzTest;
    declare static instanceType: MzTest;
    declare static schema: ModelSchema<IMzTest>;
    declare static cols: ModelColsMap<IMzTest>;
    declare static colsQuoted: ModelColsMap<IMzTest>;
    declare static primaryIndex: 'id';

    declare cls: MzTestClass;
    declare relations?: ModelRelationTypes<'mzTest'>;

    declare id: number;
    declare version: number;
  };

  type MzTestClass = typeof MzTest;

  declare class MzTestMV extends InputMaterializedView implements IMzTestMV {
    declare static type: 'mzTestMV';
    declare static Interface: IMzTestMV;
    declare static instanceType: MzTestMV;
    declare static schema: ModelSchema<IMzTestMV>;
    declare static cols: ModelColsMap<IMzTestMV>;
    declare static colsQuoted: ModelColsMap<IMzTestMV>;
    declare static primaryIndex: 'id';

    declare cls: MzTestMVClass;
    declare relations?: ModelRelationTypes<'mzTestMV'>;

    declare id: number;
    declare version: number;
  };

  type MzTestMVClass = typeof MzTestMV;

  declare class Notif extends Entity implements INotif {
    declare static type: 'notif';
    declare static Interface: INotif;
    declare static instanceType: Notif;
    declare static schema: ModelSchema<INotif>;
    declare static cols: ModelColsMap<INotif>;
    declare static colsQuoted: ModelColsMap<INotif>;
    declare static primaryIndex: 'id';

    declare cls: NotifClass;
    declare relations?: ModelRelationTypes<'notif'>;

    declare id: number;
    declare notifType: string;
    declare userId: number;
    declare groupingId: number;
    declare time: Date;
    declare params: JsonObj;
    declare hasRead: boolean;
  };

  type NotifClass = typeof Notif;

  declare class User extends Entity implements IUser {
    declare static type: 'user';
    declare static Interface: IUser;
    declare static instanceType: User;
    declare static schema: ModelSchema<IUser>;
    declare static cols: ModelColsMap<IUser>;
    declare static colsQuoted: ModelColsMap<IUser>;
    declare static primaryIndex: 'id';

    declare cls: UserClass;
    declare relations?: ModelRelationTypes<'user'>;

    declare id: number;
    declare email: string;
    declare name: string;
    declare birthday: string;
  };

  type UserClass = typeof User;

  declare class UserAuth extends Entity implements IUserAuth {
    declare static type: 'userAuth';
    declare static Interface: IUserAuth;
    declare static instanceType: UserAuth;
    declare static schema: ModelSchema<IUserAuth>;
    declare static cols: ModelColsMap<IUserAuth>;
    declare static colsQuoted: ModelColsMap<IUserAuth>;
    declare static primaryIndex: 'id';

    declare cls: UserAuthClass;
    declare relations?: ModelRelationTypes<'userAuth'>;

    declare id: number;
    declare userId: number;
    declare password: string;
    declare registerTime: Date;
  };

  type UserAuthClass = typeof UserAuth;

  declare class UserMeta extends Entity implements IUserMeta {
    declare static type: 'userMeta';
    declare static Interface: IUserMeta;
    declare static instanceType: UserMeta;
    declare static schema: ModelSchema<IUserMeta>;
    declare static cols: ModelColsMap<IUserMeta>;
    declare static colsQuoted: ModelColsMap<IUserMeta>;
    declare static primaryIndex: 'id';

    declare cls: UserMetaClass;
    declare relations?: ModelRelationTypes<'userMeta'>;

    declare id: number;
    declare userId: number;
    declare metaKey: string;
    declare metaValue: string;
  };

  type UserMetaClass = typeof UserMeta;

}
