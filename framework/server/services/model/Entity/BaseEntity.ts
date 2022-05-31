import knexRR from 'services/knex/knexRR';
import shallowEqual from 'utils/shallowEqual';
import BaseModel from '../Model';

class BaseEntity extends BaseModel implements IBaseEntity {
  static override type: EntityType;

  static override Interface: IBaseEntity;

  static override instanceType: Entity;

  static override isMV = false;

  static withInsertOnlyPublication = false;

  static override cacheable = true;

  declare static cols: ModelColsMap<IBaseEntity>;

  declare static colsQuoted: ModelColsMap<IBaseEntity>;

  static override uniqueIndexes: (string | string[])[] = ['id'];

  static indexesNotInRR: (string | string[])[];

  static getUniqueIndexesForRR<T extends EntityClass>(this: T): ModelIndex<T>[] {
    return this.getUniqueIndexes().filter(
      idx => !this.indexesNotInRR.some(idx2 => (
        Array.isArray(idx2)
          ? shallowEqual(idx, idx2)
          : idx.length === 1 && idx[0] === idx2
      )),
    );
  }

  /*
  Start Objection fields
  */

  static override virtualAttributes = [
    'version',
    'extras',
    'relations',
  ];

  /*
  End Objection fields
  */

  constructor(..._args: any[]) {
    super();
  }

  declare __isEntity: true;

  declare cls: EntityClass;

  id!: EntityId;

  declare version: number;

  override getId() {
    return this.id;
  }

  isInitialVersion() {
    return this.version === 0;
  }
}

BaseEntity.knex(knexRR);

export default BaseEntity;
