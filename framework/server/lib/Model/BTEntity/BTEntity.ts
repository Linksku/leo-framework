import knexBT from 'services/knex/knexBT';
import type { MVWithBTEntityClass } from '../MVWithBTEntity';
import BTEntityMutator from './BTEntityMutator';

class BTEntity extends BTEntityMutator {
  static override isMV = false;

  static override cacheable = true;

  static MVType: EntityType;

  static getMVModelClass<T extends BTEntityClass>(
    this: T,
  ): ModelTypeToClass<T['MVType']> & MVWithBTEntityClass {
    return getModelClass(this.MVType) as ModelTypeToClass<T['MVType']> & MVWithBTEntityClass;
  }
}

BTEntity.knex(knexBT);

export default BTEntity;

export type BTEntityClass = typeof BTEntity;
