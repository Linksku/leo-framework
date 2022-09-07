import Entity from 'services/model/Entity';
import MaterializedView from 'services/model/MaterializedView';
import InputMaterializedView from 'services/model/InputMaterializedView';

declare global {
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
    declare version: number;
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
    declare version: number;
    declare email: string;
    declare password: string;
    declare name: string;
    declare birthday: string;
    declare registerTime: Date;
  };

  type UserClass = typeof User;

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
    declare version: number;
    declare userId: number;
    declare metaKey: string;
    declare metaValue: string;
  };

  type UserMetaClass = typeof UserMeta;

}
