import zipObject from 'lodash/zipObject';

import modelsCache from 'services/cache/modelsCache';
import modelIdsCache from 'services/cache/modelIdsCache';
import validateUniquePartial from 'utils/models/validateUniquePartial';
import validateNotUniquePartial from 'utils/models/validateNotUniquePartial';
import getIndexesFirstColumn from 'utils/models/getIndexesFirstColumn';
import getModelIndexDataLoader from 'services/dataLoader/getModelIndexDataLoader';
import BaseModel from './BaseModel';
import selectRelated from './methods/selectRelated';
import includeRelated from './methods/includeRelated';

type OrderByColumns<T extends ModelClass> = {
  column: ModelKey<T>,
  order: 'asc' | 'desc',
}[];

function sortEntities<T extends ModelClass>(
  entities: ModelInstance<T>[],
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
  ): Promise<ModelInstance<T> | null> {
    if (!process.env.PRODUCTION && _partial instanceof BaseModel) {
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
    return cached as ModelInstance<T> | null;
  }

  // May return fewer ents than keys.
  static async selectBulk<T extends ModelClass>(
    this: T,
    colOrIndex: ModelKey<T> | ModelKey<T>[],
    values: (string | number | (string | number | null)[])[],
  ): Promise<ModelInstance<T>[]> {
    if (!process.env.PRODUCTION
      && values.length !== (new Set(values.map(v => JSON.stringify(v)))).size) {
      throw new Error(`${this.type}.selectBulk: duplicate values in ${JSON.stringify(values)}`);
    }

    const partials = typeof colOrIndex === 'string'
      ? (values as (string | number)[])
        .map(val => ({
          [colOrIndex]: val,
        } as unknown as ModelPartial<T>))
      : (values as (string | number | null)[][])
        .map(val => {
          const partial: ModelPartial<T> = {};
          for (const [i, k] of colOrIndex.entries()) {
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
  // todo: mid/mid add limit to selectIdColumn
  static async selectIdColumn<T extends ModelClass>(
    this: T,
    column: ModelKey<T>,
    partial: ModelPartial<T>,
  ): Promise<EntityId[]> {
    if (Object.keys(partial).length !== 1) {
      // Temp.
      throw new Error(`${this.type}.selectIdColumn: only single column is allow`);
    }
    if (!getIndexesFirstColumn(this).has(column)) {
      throw new Error(`${this.type}.selectIdColumn: can't use ${column} as condition`);
    }

    const ids = await modelIdsCache.get(this, column, partial);
    if (!process.env.PRODUCTION && ids.length > 1000) {
      throw new Error(`${this.type}.selectIdColumn: ${ids.length} rows: ${Object.keys(partial)}`);
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
  ): Promise<ModelInstance<T>[]> {
    if (TS.hasProp(partial, 'id')) {
      throw new Error(`${this.type}.selectAll: can't use id in partial`);
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

  static selectRelated = selectRelated;

  static includeRelated = includeRelated;

  selectedRelated<
    T extends Model,
    RelationName extends keyof ModelTypeToRelations<T['cls']['type']> & string
  >(
    this: T,
    name: RelationName,
  ): Promise<ModelTypeToRelations<T['cls']['type']>[RelationName]['tsType']> {
    return selectRelated
      // @ts-ignore idk
      .call(this.constructor as T['cls'], this, name);
  }

  includeRelated<
    T extends Model,
    RelationName extends keyof ModelTypeToRelations<T['cls']['type']> & string,
    NestedRelation extends ModelNestedRelations[T['cls']['type']]
  >(
    this: T,
    names: (RelationName | NestedRelation | null)[],
  ) {
    // @ts-ignore idk TS this
    return includeRelated
      .call(this.constructor as T['cls'], [this], names);
  }
}
