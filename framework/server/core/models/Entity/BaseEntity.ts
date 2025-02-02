import knexRR from 'services/knex/knexRR';
import knexBT from 'services/knex/knexBT';
import shallowEqual from 'utils/shallowEqual';
import { HAS_MVS } from 'config/__generated__/consts';
import BaseModel from '../Model';

class BaseEntity extends BaseModel implements IBaseEntity {
  static override type: EntityType;

  static override Interface: IBaseEntity;

  static override instanceType: Entity;

  static override isEntity = true;

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

  // Snowflake ids increase with time, but there will be gaps
  id!: EntityId;

  override getId(): EntityId {
    return this.id;
  }
}

BaseEntity.knex(HAS_MVS ? knexRR : knexBT);

export default BaseEntity;
