import type { RelationMappings } from 'objection';

import knexMaterialize from 'services/knex/knexMaterialize';
import { Relations, relationsToMappings } from '../modelRelations';
import Model from '../Model';

class MVCache extends Model {
  static override isMV = true;

  static MVQueryDeps: ModelClass[] = [];

  static MVQuery: QueryBuilder<Model>;

  static extendMVQuery?: ((query: QueryBuilder<Model>) => QueryBuilder<Model>)[];

  static relations: Relations = {};

  static override get relationMappings(): RelationMappings {
    return relationsToMappings(this, this.relations, this.schema);
  }

  override getId(): number | string {
    const index = (this.constructor as MVCacheClass).getIdColumn();
    if (!Array.isArray(index)) {
      // @ts-ignore wontfix key error
      return this[index];
    }
    return index
      // @ts-ignore wontfix key error
      .map(i => this[i])
      .join(',');
  }
}

MVCache.knex(knexMaterialize);

export type MVCacheClass = typeof MVCache;

export default MVCache;
