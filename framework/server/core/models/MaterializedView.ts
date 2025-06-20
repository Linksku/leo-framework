import knexRR from 'services/knex/knexRR';
import { getApiId } from 'utils/models/apiModelId';
import Model from './Model';

class MaterializedView extends Model {
  static override isMV = true;

  // Set true if DEFAULT_REDIS_CACHE_TTL staleness is ok
  // todo: med/hard use mz tail to trigger invalidating mv cache
  static override cacheable = false;

  static replicaTable: Nullish<string>;

  static override getReplicaTable(): string | null {
    return this.replicaTable === undefined ? this.tableName : this.replicaTable;
  }

  static MVQueryDeps: ModelClass[] = [];

  static getMVQuery: () => QueryBuilder<Model>;

  static extendMVQuery?: ((query: QueryBuilder<Model>) => QueryBuilder<Model>)[];

  override getId(): ApiEntityId {
    return getApiId(this);
  }
}

MaterializedView.knex(knexRR);

export type MaterializedViewClass = typeof MaterializedView;

export default MaterializedView;
