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
    declare static idColumn: 'id';

    declare cls: NotifClass;
    declare relations?: ModelRelationsTypes<'notif'>;

    declare id: number;
    declare version: number;
    declare notifType: string;
    declare userId: number;
    declare groupingId: number;
    declare time: Date;
    declare params: Pojo;
    declare hasRead: boolean;
  };

  type NotifClass = typeof Notif;

  declare class Report extends Entity implements IReport {
    declare static type: 'report';
    declare static Interface: IReport;
    declare static instanceType: Report;
    declare static schema: ModelSchema<IReport>;
    declare static cols: ModelColsMap<IReport>;
    declare static colsQuoted: ModelColsMap<IReport>;
    declare static idColumn: 'id';

    declare cls: ReportClass;
    declare relations?: ModelRelationsTypes<'report'>;

    declare id: number;
    declare version: number;
    declare reporterId: number;
    declare entityType: 'post';
    declare entityId: number;
    declare time: Date;
  };

  type ReportClass = typeof Report;

  declare class ReportsCountMV extends InputMaterializedView implements IReportsCountMV {
    declare static type: 'reportsCountMV';
    declare static Interface: IReportsCountMV;
    declare static instanceType: ReportsCountMV;
    declare static schema: ModelSchema<IReportsCountMV>;
    declare static cols: ModelColsMap<IReportsCountMV>;
    declare static colsQuoted: ModelColsMap<IReportsCountMV>;
    declare static idColumn: ['entityType', 'entityId'];

    declare cls: ReportsCountMVClass;
    declare relations?: ModelRelationsTypes<'reportsCountMV'>;

    declare entityType: 'post';
    declare entityId: number;
    declare count: number;
  };

  type ReportsCountMVClass = typeof ReportsCountMV;

  declare class User extends Entity implements IUser {
    declare static type: 'user';
    declare static Interface: IUser;
    declare static instanceType: User;
    declare static schema: ModelSchema<IUser>;
    declare static cols: ModelColsMap<IUser>;
    declare static colsQuoted: ModelColsMap<IUser>;
    declare static idColumn: 'id';

    declare cls: UserClass;
    declare relations?: ModelRelationsTypes<'user'>;

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
    declare static idColumn: 'id';

    declare cls: UserMetaClass;
    declare relations?: ModelRelationsTypes<'userMeta'>;

    declare id: number;
    declare version: number;
    declare userId: number;
    declare metaKey: string;
    declare metaValue: string;
  };

  type UserMetaClass = typeof UserMeta;

}
