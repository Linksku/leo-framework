import zipObject from 'lodash/zipObject';

import modelsCache from 'services/cache/modelsCache';
import modelIdsCache from 'services/cache/modelIdsCache';
import validateUniquePartial from 'utils/models/validateUniquePartial';
import getPartialUniqueIndex from 'utils/models/getPartialUniqueIndex';
import selectRelatedWithAssocs from 'utils/models/selectRelatedWithAssocs';
import { warnIfRecentlyWritten } from 'services/model/helpers/lastWriteTimeHelpers';
import BaseModel from './BaseModel';

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
  static async selectOne<
    T extends ModelClass,
    P extends ModelPartial<T>,
  >(
    this: T,
    partial: ModelPartialDefined<T, P>,
  ): Promise<ModelInstance<T> | null> {
    if (!process.env.PRODUCTION && partial instanceof BaseModel) {
      throw new Error(`${this.name}.selectOne: partial is a model instance.`);
    }
    for (const kv of Object.entries(partial)) {
      if (kv[1] === undefined) {
        if (!process.env.PRODUCTION) {
          ErrorLogger.warn(new Error(`${this.name}.selectOne: partial has undefined value`), JSON.stringify(partial));
        }
        return null;
      }
    }

    validateUniquePartial(this, partial);

    await warnIfRecentlyWritten(this.type);
    return modelsCache.get(this, partial);
  }

  // May return fewer ents than keys.
  static async selectBulk<T extends ModelClass>(
    this: T,
    colOrIndex: ModelKey<T> | ModelKey<T>[],
    values: (string | number | (string | number | null)[])[],
  ): Promise<ModelInstance<T>[]> {
    if (!process.env.PRODUCTION
      && values.length !== (new Set(values.map(v => JSON.stringify(v)))).size) {
      throw new ErrorWithCtx(`${this.type}.selectBulk: duplicate values`, JSON.stringify(values).slice(0, 100));
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
    const entities = await Promise.all(partials.map(partial => this.selectOne(
      // @ts-ignore wontfix undefined hack
      partial,
    )));
    return TS.filterNulls(entities);
  }

  // Order isn't guaranteed.
  // todo: mid/mid add limit to selectPrimaryColumn
  static async selectPrimaryColumn<
    T extends ModelClass,
    P extends ModelPartial<T>,
  >(
    this: T,
    partial: ModelPartialDefined<T, P>,
  ): Promise<(T['primaryIndex'] extends any[] ? (number | string)[] : number | string)[]> {
    await warnIfRecentlyWritten(this.type);
    const ids = await modelIdsCache.get(this, partial);
    if (!process.env.PRODUCTION && ids.length > 1000) {
      throw new ErrorWithCtx(`${this.type}.selectPrimaryColumn: > 1000 rows`, Object.keys(partial).join(','));
    }
    return ids as (T['primaryIndex'] extends any[] ? (number | string)[] : number | string)[];
  }

  // todo: mid/hard add pagination to selectAll
  static async selectAll<
    T extends ModelClass,
    P extends ModelPartial<T>,
  >(
    this: T,
    partial: ModelPartialDefined<T, P>,
    {
      orderByColumns,
      allowUnique,
    }: {
      orderByColumns?: OrderByColumns<T>,
      allowUnique?: boolean,
    } = {},
  ): Promise<ModelInstance<T>[]> {
    if (TS.hasProp(partial, 'id')) {
      if (allowUnique) {
        const ent = await this.selectOne(partial as ModelPartialDefined<T, P>);
        return ent ? [ent] : [];
      }
      throw new Error(`${this.type}.selectAll: can't use id in partial`);
    }

    if (getPartialUniqueIndex(this, partial)) {
      if (allowUnique) {
        const ent = await this.selectOne(partial);
        return ent ? [ent] : [];
      }
      throw new Error(`${this.type}.selectAll: can't use unique partial for ${this.type}: ${Object.keys(partial).join(',')}`);
    }

    const ids = await this.selectPrimaryColumn(partial);
    const idPartials = ids.map(id => {
      if (Array.isArray(id) && Array.isArray(this.primaryIndex)) {
        return zipObject(this.primaryIndex, id) as unknown as ModelPartialDefined<T, P>;
      }
      if (!Array.isArray(id) && !Array.isArray(this.primaryIndex)) {
        return {
          [this.primaryIndex]: id,
        } as unknown as ModelPartialDefined<T, P>;
      }
      throw new Error(`${this.type}.selectAll: invalid ids`);
    });

    const entities = TS.filterNulls(await Promise.all(idPartials.map(
      idPartial => this.selectOne(idPartial),
    )));
    if (orderByColumns) {
      sortEntities(entities, orderByColumns);
    }
    return entities;
  }

  static async selectRelated<
    T extends ModelClass,
    RelationName extends keyof ModelRelationTypes<T['type']> & string,
  >(
    this: T,
    entity: ModelInstance<T>,
    fullName: RelationName,
  ): Promise<ModelRelationTypes<T['type']>[RelationName]> {
    const { related } = await selectRelatedWithAssocs(this, entity, fullName);
    // @ts-ignore wontfix relation
    return related;
  }

  async selectRelated<
    T extends Model,
    RelationName extends keyof ModelRelationTypes<T['cls']['type']> & string,
  >(
    this: T,
    fullName: RelationName,
  ): Promise<ModelRelationTypes<T['cls']['type']>[RelationName]> {
    // @ts-ignore wontfix relation
    const { related } = await selectRelatedWithAssocs(this.constructor, this, fullName);
    // @ts-ignore wontfix relation
    return related;
  }
}
