import knexRR from 'services/knex/knexRR';
import Model from '../Model';

class MaterializedView extends Model {
  static override isMV = true;

  static override cacheable = false;

  static replicaTable: Nullish<string>;

  static override getReplicaTable(): string | null {
    return this.replicaTable === undefined ? this.tableName : this.replicaTable;
  }

  static MVQueryDeps: ModelClass[] = [];

  static MVQuery: QueryBuilder<Model>;

  static extendMVQuery?: ((query: QueryBuilder<Model>) => QueryBuilder<Model>)[];

  override getId(): ApiEntityId {
    const index = (this.constructor as MaterializedViewClass).getIdColumn();
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

MaterializedView.knex(knexRR);

export type MaterializedViewClass = typeof MaterializedView;

export default MaterializedView;
