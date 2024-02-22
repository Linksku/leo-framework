import knexRR from 'services/knex/knexRR';
import shallowEqual from 'utils/shallowEqual';
import BaseModel from '../Model';

class BaseEntity extends BaseModel implements IBaseEntity {
  static override type: EntityType;

  static override Interface: IBaseEntity;

  static override instanceType: Entity;

  // Note: the base table is still updateable,
  //   but updates aren't sent to MZ to save memory
  static useInsertOnlyPublication = false;

  static skipColumnsForMZ: string[] = [];

  static override cacheable = true;

  static deleteable = false;

  declare static cols: ModelColsMap<EntityType>;

  declare static colsQuoted: ModelColsMap<EntityType>;

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

  constructor(..._args: any[]) {
    super();
  }

  declare __isEntity: true;

  declare cls: EntityClass;

  // Assume entity id increases with time, but there will be gaps
  // todo: mid/hard use snowflake ids
  id!: EntityId;

  override getId() {
    return this.id;
  }
}

BaseEntity.knex(knexRR);

export default BaseEntity;
