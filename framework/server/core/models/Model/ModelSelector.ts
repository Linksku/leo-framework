import zipObject from 'lodash/zipObject.js';

import modelsCache from 'services/cache/modelsCache';
import modelColCache from 'services/cache/modelColCache';
import modelIdsCache from 'services/cache/modelIdsCache';
import validateUniquePartial from 'utils/models/validateUniquePartial';
import validateNonUniquePartial from 'utils/models/validateNonUniquePartial';
import { warnIfRecentlyWritten } from 'core/models/helpers/lastWriteTimeHelpers';
import RequestContextLocalStorage from 'core/requestContext/RequestContextLocalStorage';
import arrFirstDuplicate from 'utils/arrFirstDuplicate';
import BaseModel from './BaseModel';

type OrderByColumns<T extends ModelClass> = {
  column: ModelKey<T>,
  order: 'asc' | 'desc',
}[];

function partialHasUndefined(Model: ModelClass, partial: ModelPartial<ModelClass>) {
  for (const kv of Object.entries(partial)) {
    if (kv[1] === undefined) {
      ErrorLogger.warn(
        new Error(`${Model.name}: partial has undefined value`),
        { partial },
      );
      return true;
    }
  }
  return false;
}

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

// todo: low/med add cached count to ModelSelector
export default class ModelSelector extends BaseModel {
  static selectOne<
    T extends ModelClass,
    P extends ModelPartialExact<T, P> & ModelUniquePartial<T>,
  >(
    this: T,
    partial: P,
  ): Promise<Readonly<ModelInstance<T>> | null> {
    if (!process.env.PRODUCTION && partial instanceof BaseModel) {
      throw new Error(`${this.name}.selectOne: partial is a model instance.`);
    }
    validateUniquePartial(this, partial);
    if (!process.env.PRODUCTION && partialHasUndefined(this, partial)) {
      return Promise.resolve(null);
    }

    wrapPromise(warnIfRecentlyWritten(this.type), 'warn');

    const rc = getRC();
    return RequestContextLocalStorage.exit(
      () => modelsCache.get(rc, this, partial),
    );
  }

  // May return fewer ents than keys when keepNulls=false
  static async selectBulk<
    T extends ModelClass,
    P extends ModelPartialExact<T, P> & ModelUniquePartial<T>,
    KeepNulls extends boolean | undefined = undefined,
  >(
    this: T,
    partials: P[],
    {
      keepNulls,
    }: {
      keepNulls?: KeepNulls,
    } = {},
  ): Promise<(
    Readonly<ModelInstance<T>> | (KeepNulls extends true ? null : never)
  )[]> {
    if (!partials.length) {
      return [];
    }

    if (!process.env.PRODUCTION) {
      const Model = this as ModelClass;
      const duplicate = arrFirstDuplicate(partials.map(p => Model.stringify(p)));
      if (duplicate) {
        throw getErr(`${this.type}.selectBulk: duplicate values`, { duplicate, partials });
      }
      const firstKeys = TS.objKeys(partials[0]).join(',');
      for (const partial of partials) {
        if (TS.objKeys(partial).join(',') !== firstKeys) {
          throw getErr(`${this.type}.selectBulk: inconsistent keys`, { partials });
        }
      }
    }
    validateUniquePartial(this, partials[0]);

    wrapPromise(warnIfRecentlyWritten(this.type), 'warn');

    const rc = getRC();
    const entities = await RequestContextLocalStorage.exit(
      () => Promise.all(partials.map(partial => modelsCache.get(
        rc,
        this,
        partial,
      ))),
    );
    return (keepNulls
      ? entities
      : TS.filterNulls(entities)) as (
        Readonly<ModelInstance<T>> | (KeepNulls extends true ? null : never)
      )[];
  }

  static selectCol<
    T extends ModelClass,
    P extends ModelPartialExact<T, P> & ModelUniquePartial<T>,
    Col extends ModelKey<T>,
  >(
    this: T,
    partial: P,
    col: Col,
  ): Promise<T['Interface'][Col] | undefined> {
    if (!process.env.PRODUCTION && partial instanceof BaseModel) {
      throw new Error(`${this.name}.selectOne: partial is a model instance.`);
    }
    validateUniquePartial(this, partial);
    if (!process.env.PRODUCTION && partialHasUndefined(this, partial)) {
      return Promise.resolve(undefined);
    }

    wrapPromise(warnIfRecentlyWritten(this.type), 'warn');

    const rc = getRC();
    return RequestContextLocalStorage.exit(
      () => modelColCache.get(rc, this, partial, col),
    ) as Promise<T['Interface'][Col] | undefined>;
  }

  static async selectBulkCol<
    T extends ModelClass,
    P extends ModelPartialExact<T, P> & ModelUniquePartial<T>,
    Col extends ModelKey<T>,
    KeepUndefined extends boolean | undefined = undefined,
  >(
    this: T,
    partials: P[],
    col: Col,
    {
      keepUndefined,
    }: {
      keepUndefined?: KeepUndefined,
    } = {},
  ): Promise<(
    T['Interface'][Col] | (KeepUndefined extends true ? undefined : never)
  )[]> {
    if (!partials.length) {
      return [];
    }

    validateUniquePartial(this, partials[0]);

    wrapPromise(warnIfRecentlyWritten(this.type), 'warn');

    const rc = getRC();
    const vals = await RequestContextLocalStorage.exit(
      () => Promise.all(partials.map(
        partial => modelColCache.get(rc, this, partial, col),
      )),
    ) as (T['Interface'][Col] | undefined)[];
    return (keepUndefined
      ? vals
      : vals.filter(val => val !== undefined)) as (
        T['Interface'][Col] | (KeepUndefined extends true ? undefined : never)
      )[];
  }

  static async selectCount<
    T extends ModelClass,
    P extends ModelPartialExact<T, P>,
  >(
    this: T,
    partial: P,
  ): Promise<number> {
    if (!validateNonUniquePartial(this, partial)) {
      return 0;
    }
    if (!process.env.PRODUCTION && partialHasUndefined(this, partial)) {
      return 0;
    }

    wrapPromise(warnIfRecentlyWritten(this.type), 'warn');

    const rc = getRC();
    return RequestContextLocalStorage.exit(async () => {
      // todo: low/med add count cache
      const ids = await modelIdsCache.get(rc, this, partial);
      if (!process.env.PRODUCTION && ids.length > 1000) {
        throw getErr(`${this.type}.selectCount: > 1000 rows`, { partial });
      }
      return ids.length;
    });
  }

  // todo: med/hard add selectAllCol
  // Note: invalidate cache is hard for selectAllCol because there are too many combinations
  //   of partials and cols
  static async selectAllIds<
    T extends ModelClass,
    P extends ModelPartialExact<T, P>,
    Id extends T['primaryIndex'] extends any[]
      ? (string | number)[]
      : T['primaryIndex'] extends keyof T['Interface']
        ? T['Interface'][T['primaryIndex']]
        : never,
  >(
    this: T,
    partial: P,
  ): Promise<Id[]> {
    if (!validateNonUniquePartial(this, partial)) {
      return [];
    }
    if (!process.env.PRODUCTION && partialHasUndefined(this, partial)) {
      return [];
    }

    wrapPromise(warnIfRecentlyWritten(this.type), 'warn');

    const rc = getRC();
    return RequestContextLocalStorage.exit(async () => {
      const ids = await modelIdsCache.get(rc, this, partial);
      if (!process.env.PRODUCTION && ids.length > 1000) {
        throw getErr(`${this.type}.selectAllIds: > 1000 rows`, { partial });
      }
      return ids as Id[];
    });
  }

  // todo: med/hard add pagination/limit to selectAll
  static async selectAll<
    T extends ModelClass,
    P extends ModelPartialExact<T, P>,
  >(
    this: T,
    partial: P,
    {
      orderByColumns,
    }: {
      orderByColumns?: OrderByColumns<T>,
    } = {},
  ): Promise<Readonly<ModelInstance<T>>[]> {
    if (!validateNonUniquePartial(this, partial)) {
      return [];
    }
    if (!process.env.PRODUCTION && partialHasUndefined(this, partial)) {
      return [];
    }

    wrapPromise(warnIfRecentlyWritten(this.type), 'warn');

    const rc = getRC();
    return RequestContextLocalStorage.exit(async () => {
      // Order isn't guaranteed.
      const ids = await modelIdsCache.get(rc, this, partial) as (
        T['primaryIndex'] extends any[] ? (number | string)[] : number | string
      )[];
      if (!process.env.PRODUCTION && ids.length > 1000) {
        throw getErr(`${this.type}.selectAll: > 1000 rows`, { partial });
      }

      const idPartials = ids.map(id => {
        if (Array.isArray(id) && Array.isArray(this.primaryIndex)) {
          return zipObject(this.primaryIndex, id) as unknown as ModelPartialExact<T, P>;
        }
        if (!Array.isArray(id) && !Array.isArray(this.primaryIndex)) {
          return {
            [this.primaryIndex]: id,
          } as unknown as ModelPartialExact<T, P>;
        }
        throw new Error(`${this.type}.selectAll: invalid ids`);
      });

      const entities = TS.filterNulls(await Promise.all(idPartials.map(
        idPartial => modelsCache.get(rc, this, idPartial),
      )));
      if (orderByColumns) {
        sortEntities(entities, orderByColumns);
      }

      return entities;
    });
  }
}
