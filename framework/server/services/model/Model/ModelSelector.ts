import zipObject from 'lodash/zipObject';

import modelsCache from 'services/cache/modelsCache';
import modelIdsCache from 'services/cache/modelIdsCache';
import validateUniquePartial from 'utils/models/validateUniquePartial';
import getPartialUniqueIndex from 'utils/models/getPartialUniqueIndex';
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

function _selectOne<
  T extends ModelClass,
  P extends ModelPartialExact<T, P>,
>(
  rc: Nullish<RequestContext>,
  Model: T,
  partial: P,
): Promise<ModelInstance<T> | null> {
  return modelsCache.get(rc, Model, partial);
}

// Order isn't guaranteed.
// todo: mid/mid add limit to selectPrimaryColumn
function _selectPrimaryColumn<
  T extends ModelClass,
  P extends ModelPartialExact<T, P>,
>(
  rc: Nullish<RequestContext>,
  Model: T,
  partial: P,
): Promise<(T['primaryIndex'] extends any[] ? (number | string)[] : number | string)[]> {
  return modelIdsCache.get(rc, Model, partial) as Promise<(
    T['primaryIndex'] extends any[] ? (number | string)[] : number | string
  )[]>;
}

export default class ModelSelector extends BaseModel {
  static selectOne<
    T extends ModelClass,
    P extends ModelPartialExact<T, P>,
  >(
    this: T,
    partial: P,
  ): Promise<ModelInstance<T> | null> {
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
      () => _selectOne(rc, this, partial),
    );
  }

  // May return fewer ents than keys.
  static async selectBulk<T extends ModelClass>(
    this: T,
    colOrIndex: ModelKey<T> | ModelKey<T>[],
    values: (string | number | (string | number | null)[])[],
  ): Promise<ModelInstance<T>[]> {
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
        const partial: ModelPartial<T> = {};
        for (let i = 0; i < colOrIndex.length; i++) {
          partial[colOrIndex[i]] = (val as any[])[i];
        }
        return partial;
      });
    validateUniquePartial(this, partials[0]);

    wrapPromise(warnIfRecentlyWritten(this.type), 'warn');

    const rc = getRC();
    const entities = await RequestContextLocalStorage.exit(
      () => Promise.all(partials.map(partial => _selectOne(
        rc,
        this,
        // @ts-ignore wontfix undefined hack
        partial,
      ))),
    );
    return TS.filterNulls(entities);
  }

  // todo: mid/hard add pagination to selectAll
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
  ): Promise<ModelInstance<T>[]> {
    if (!process.env.PRODUCTION && partial instanceof BaseModel) {
      throw new Error(`${this.name}.selectAll: partial is a model instance.`);
    }
    if (getPartialUniqueIndex(this, partial)) {
      throw new Error(`${this.type}.selectAll: can't use unique partial for ${this.type}: ${Object.keys(partial).join(',')}`);
    }

    for (const kv of Object.entries(partial)) {
      if (kv[1] === undefined) {
        if (!process.env.PRODUCTION) {
          ErrorLogger.warn(
            new Error(`${this.name}.selectAll: partial has undefined value`),
            { partial },
          );
        }
        return [];
      }
    }

    wrapPromise(warnIfRecentlyWritten(this.type), 'warn');

    const rc = getRC();
    return RequestContextLocalStorage.exit(async () => {
      const ids = await _selectPrimaryColumn(rc, this, partial);
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
        idPartial => _selectOne(rc, this, idPartial),
      )));
      if (orderByColumns) {
        sortEntities(entities, orderByColumns);
      }

      return entities;
    });
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
