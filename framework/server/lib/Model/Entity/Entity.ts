import BaseModel from '../Model';

export default class Entity extends BaseModel implements IEntity {
  static override type: EntityType;

  static override Interface: IEntity;

  declare static cols: ModelColsMap<IEntity>;

  declare static colsQuoted: ModelColsMap<IEntity>;

  static override uniqueIndexes: (string | string[])[] = ['id'];

  /*
  Start Objection fields
  */

  static override virtualAttributes = [
    'version',
    'extras',
  ];

  /*
  End Objection fields
  */

  constructor(..._args: any[]) {
    super();
  }

  declare __isEntity: true;

  id!: EntityId;

  declare version: number;

  override getId() {
    return this.id;
  }

  isInitialVersion() {
    return this.version === 0;
  }
}
