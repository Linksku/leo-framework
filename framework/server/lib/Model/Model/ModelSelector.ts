import zipObject from 'lodash/zipObject';

import modelsCache from 'services/cache/modelsCache';
import modelIdsCache from 'services/cache/modelIdsCache';
import validateUniquePartial from 'lib/modelUtils/validateUniquePartial';
import validateNotUniquePartial from 'lib/modelUtils/validateNotUniquePartial';
import getIndexesFirstColumn from 'lib/modelUtils/getIndexesFirstColumn';
import getModelIndexDataLoader from 'services/dataLoader/getModelIndexDataLoader';
import BaseModel from './BaseModel';

type OrderByColumns<T extends ModelClass> = {
  column: ModelKey<T>,
  order: 'asc' | 'desc',
}[];

function sortEntities<T extends ModelClass>(
  entities: InstanceType<T>[],
  orderByColumns: OrderByColumns<T>,
) {
  entities.sort((a, b) => {
    for (const { column, order } of orderByColumns) {
      if (a[column] > b[column]) {
        return order === 'asc' ? 1 : -1;
      }
      if (a[column] < b[column]) {
        return order === 'asc' ? -1 : 1;
      }
    }
    return 0;
  });
}

export default class ModelSelector extends BaseModel {
  static async selectOne<T extends ModelClass>(
    this: T,
    _partial: Nullable<ModelPartial<T>>,
  ): Promise<InstanceType<T> | null> {
    if (process.env.NODE_ENV !== 'production' && _partial instanceof BaseModel) {
      throw new Error(`${this.name}.selectOne: partial is a model instance.`);
    }
    for (const val of Object.values(_partial)) {
      // Only truthy values can be unique keys.
      if (!val) {
        return null;
      }
    }
    const partial = _partial as ModelPartial<T>;

    validateUniquePartial(this, partial);

    const cached = await modelsCache.get(this, partial);
    return cached as InstanceType<T> | null;
  }

  // May return fewer ents than keys.
  static async selectBulk<T extends ModelClass>(
    this: T,
    key: ModelIndex<T>,
    values: (string | number | (string | number)[])[],
  ): Promise<InstanceType<T>[]> {
    const partials = typeof key === 'string'
      ? (values as (string | number)[])
        .map(val => ({
          [key]: val,
        } as unknown as ModelPartial<T>))
      : (values as (string | number)[][])
        .map(val => {
          const partial: ModelPartial<T> = {};
          for (const [i, k] of key.entries()) {
            partial[k] = val[i] as any;
          }
          return partial;
        });
    const entities = await Promise.all(partials.map(
      partial => this.selectOne(partial),
    ));
    return TS.filterNulls(entities);
  }

  // Order isn't guaranteed.
  // todo: mid/mid add limit
  static async selectIdColumn<T extends ModelClass>(
    this: T,
    column: ModelKey<T>,
    partial: ModelPartial<T>,
  ): Promise<EntityId[]> {
    if (Object.keys(partial).length !== 1) {
      // Temp.
      throw new Error(`selectIdColumn: only single column is allow`);
    }
    if (!getIndexesFirstColumn(this).has(column)) {
      throw new Error(`selectIdColumn: can't use ${column} as condition in ${this.type}`);
    }

    const ids = await modelIdsCache.get(this, column, partial);
    if (process.env.NODE_ENV !== 'production' && ids.length > 1000) {
      throw new Error(`selectIdColumn: ${ids.length} rows for ${this.type}: ${Object.keys(partial)}`);
    }
    return ids;
  }

  // todo: mid/hard add pagination to selectAll
  static async selectAll<T extends ModelClass>(
    this: T,
    partial: ModelPartial<T>,
    {
      orderByColumns,
    }: {
      orderByColumns?: OrderByColumns<T>,
    } = {},
  ): Promise<InstanceType<T>[]> {
    if (TS.hasProp(partial, 'id')) {
      throw new Error(`selectAll: can't use id in partial for ${this.type}`);
    }
    validateNotUniquePartial(this, partial);

    let idPartials: ModelPartial<T>[];
    const idColumn = this.getIdColumn();
    if (typeof idColumn === 'string') {
      const ids = await this.selectIdColumn(idColumn, partial);
      idPartials = ids.map(id => ({
        [idColumn]: id,
      } as unknown as ModelPartial<T>));
    } else {
      // todo: mid/mid cache multi-column ids
      const rows = await getModelIndexDataLoader(this, idColumn).load(partial);
      idPartials = rows.map(r => zipObject(idColumn, r) as unknown as ModelPartial<T>);
    }

    const entities = TS.filterNulls(await Promise.all(idPartials.map(
      idPartial => this.selectOne(idPartial),
    )));
    if (orderByColumns) {
      sortEntities(entities, orderByColumns);
    }
    return entities;
  }
}
