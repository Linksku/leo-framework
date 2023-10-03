import zipObject from 'lodash/zipObject.js';

import modelsCache from 'services/cache/modelsCache';
import modelIdsCache from 'services/cache/modelIdsCache';
import validateUniquePartial from 'utils/models/validateUniquePartial';
import validateNonUniquePartial from 'utils/models/validateNonUniquePartial';
import selectRelatedWithAssocs from 'utils/models/selectRelatedWithAssocs';
import { warnIfRecentlyWritten } from 'services/model/helpers/lastWriteTimeHelpers';
import RequestContextLocalStorage from 'services/requestContext/RequestContextLocalStorage';
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

// todo: low/mid add cached count to ModelSelector
export default class ModelSelector extends BaseModel {
  static selectOne<
    T extends ModelClass,
    P extends ModelPartialExact<T, P>,
  >(
    this: T,
    partial: P,
  ): Promise<Readonly<ModelInstance<T>> | null> {
    if (!process.env.PRODUCTION && partial instanceof BaseModel) {
      throw new Error(`${this.name}.selectOne: partial is a model instance.`);
    }
    validateUniquePartial(this, partial);

    for (const kv of Object.entries(partial)) {
      if (kv[1] === undefined) {
        if (!process.env.PRODUCTION) {
          ErrorLogger.warn(
            new Error(`${this.name}.selectOne: partial has undefined value`),
            { partial },
          );
        }
        return Promise.resolve(null);
      }
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
    ColOrIndex extends ModelKey<T> | ModelKey<T>[],
    KeepNulls extends boolean | undefined = undefined,
  >(
    this: T,
    colOrIndex: ColOrIndex,
    values: (ColOrIndex extends any[]
      ? (string | number | null)[]
      : (string | number))[],
    {
      keepNulls,
    }: {
      keepNulls?: KeepNulls,
    } = {},
  ): Promise<(
    Readonly<ModelInstance<T>> | (KeepNulls extends true ? null : never)
  )[]> {
    if (!process.env.PRODUCTION) {
      if (values.length !== (new Set(values.map(v => JSON.stringify(v)))).size) {
        throw getErr(`${this.type}.selectBulk: duplicate values`, { values });
      }
      if (typeof colOrIndex === 'string' && values.some(val => Array.isArray(val))) {
        throw getErr(`${this.type}.selectBulk: values are arrays`, { values });
      }
      if (Array.isArray(colOrIndex) && values.some(val => !Array.isArray(val))) {
        throw getErr(`${this.type}.selectBulk: values aren't arrays`, { values });
      }
    }

    const definedValues = values.filter(val => val !== undefined);
    if (!process.env.PRODUCTION && definedValues.length !== values.length) {
      throw new Error(`${this.type}.selectBulk: undefined values`);
    }
    if (!definedValues.length) {
      return [];
    }

    const partials = typeof colOrIndex === 'string'
      ? definedValues.map(val => ({
        [colOrIndex]: val as string | number,
      } as unknown as ModelPartial<T>))
      : definedValues.map(val => {
        const partial = Object.create(null) as ModelPartial<T>;
        for (let i = 0; i < colOrIndex.length; i++) {
          partial[colOrIndex[i]] = (val as any[])[i];
        }
        return partial;
      });
    validateUniquePartial(this, partials[0]);

    wrapPromise(warnIfRecentlyWritten(this.type), 'warn');

    const rc = getRC();
    const entities = await RequestContextLocalStorage.exit(
      () => Promise.all(partials.map(partial => modelsCache.get(
        rc,
        this,
        // @ts-ignore wontfix undefined hack
        partial,
      ))),
    );
    return (keepNulls
      ? entities
      : TS.filterNulls(entities)) as (
        Readonly<ModelInstance<T>> | (KeepNulls extends true ? null : never)
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

    wrapPromise(warnIfRecentlyWritten(this.type), 'warn');

    const rc = getRC();
    return RequestContextLocalStorage.exit(async () => {
      const ids = await modelIdsCache.get(rc, this, partial);
      if (!process.env.PRODUCTION && ids.length > 1000) {
        throw getErr(`${this.type}.selectAll: > 1000 rows`, { partial });
      }
      return ids.length;
    });
  }

  // todo: mid/mid function to select one column of all rows
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

  // todo: mid/hard add pagination/limit to selectAll
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

  static async selectRelated<
    T extends RRModelClass,
    RelationName extends keyof ModelRelationTypes[T['type']] & string,
  >(
    this: T,
    entity: ModelInstance<T>,
    fullName: RelationName,
  ): Promise<ModelRelationTypes[T['type']][RelationName]> {
    const { related } = await selectRelatedWithAssocs(this, entity, fullName);
    // @ts-ignore wontfix relation
    return related;
  }

  async selectRelated<
    T extends RRModel,
    RelationName extends keyof ModelRelationTypes[T['cls']['type']] & string,
  >(
    this: T,
    fullName: RelationName,
  ): Promise<ModelRelationTypes[T['cls']['type']][RelationName]> {
    // @ts-ignore wontfix relation
    const { related } = await selectRelatedWithAssocs(this.constructor, this, fullName);
    // @ts-ignore wontfix relation
    return related;
  }
}
