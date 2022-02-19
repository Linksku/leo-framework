import type { RelationMappings } from 'objection';

import knexMaterialize from 'services/knex/knexMaterialize';
import { Relations, relationsToMappings } from '../modelRelations';
import Entity from '../Entity';

class MVEntity extends Entity {
  static override isMV = true;

  static MVQueryDeps: ModelClass[] = [];

  static MVQuery: QueryBuilder<Model>;

  static extendMVQuery?: ((query: QueryBuilder<Model>) => QueryBuilder<Model>)[];

  static relations: Relations = {};

  static override get relationMappings(): RelationMappings {
    return relationsToMappings(this, this.relations, this.schema);
  }
}

MVEntity.knex(knexMaterialize);

export type MVEntityClass = typeof MVEntity;

export default MVEntity;
