import type { Knex } from 'knex';
import fromPairs from 'lodash/fromPairs.js';

import modelsCache from 'services/cache/modelsCache';
import modelIdsCache from 'services/cache/modelIdsCache';
import validateUniquePartial from 'utils/models/validateUniquePartial';
import validateNotUniquePartial from 'utils/models/validateNotUniquePartial';
import findPartialMatchingPartial from 'utils/models/findPartialMatchingPartial';
import getValDbType from 'utils/db/getValDbType';
import knexBT from 'services/knex/knexBT';
import { updateLastWriteTime } from 'services/model/helpers/lastWriteTimeHelpers';
import RequestContextLocalStorage from 'services/requestContext/RequestContextLocalStorage';
import BaseEntity from './BaseEntity';

import insert from './methods/insert';
import insertBulk from './methods/insertBulk';

export default class EntityMutator extends BaseEntity {
  static insert = insert;

  static insertBulk = insertBulk;

  static async update<
    T extends EntityClass,
    P extends ModelPartialExact<T, P>,
    Obj extends ModelPartialExact<T, Obj>,
  >(
    this: T,
    partial: P,
    obj: Obj,
    {
      trx,
    }: {
      trx?: Knex.Transaction
    } = {},
  ): Promise<EntityInstance<T> | null> {
    validateUniquePartial(this, partial);

    const rows = await entityQuery(this, trx ?? knexBT)
      .patch(obj)
      .where(partial)
      .returning('*');
    if (!process.env.PRODUCTION) {
      for (const row of rows) {
        row.$validate();
      }
    }

    const rc = getRC();
    const updated = rows[0] as EntityInstance<T> | undefined;
    if (!updated) {
      // Row doesn't exist, maybe delete from cache instead.
      await RequestContextLocalStorage.exit(
        () => Promise.all([
          modelsCache.invalidate(rc, this, obj),
          modelIdsCache.invalidate(rc, this, obj),
        ]),
      );
      return null;
    }

    await RequestContextLocalStorage.exit(
      () => Promise.all([
        modelsCache.handleUpdate(rc, this, updated),
        modelIdsCache.handleUpdate(rc, this, updated),
        updateLastWriteTime(this.type),
      ]),
    );
    return updated;
  }

  static async updateBulk<T extends EntityClass, Obj extends ModelPartialExact<T, Obj>>(
    this: T,
    uniqueColOrIndex: ModelKey<T> | ModelKey<T>[],
    objs: Obj[],
    {
      trx,
    }: {
      trx?: Knex.Transaction
    } = {},
  ): Promise<(EntityInstance<T> | null)[]> {
    const firstObj = objs[0];
    if (!firstObj) {
      return [];
    }
    const allCols: ModelKey<T>[] = TS.objKeys(firstObj);
    const allVals: any[] = objs.flatMap(obj => allCols.map(k => obj[k]));

    if (!process.env.PRODUCTION) {
      const allColsSet = new Set(allCols);
      if (objs.some(obj => {
        const keys: ModelKey<T>[] = TS.objKeys(obj);
        return keys.length !== allColsSet.size || keys.some(k => !allColsSet.has(k));
      })) {
        throw new Error(`${this.name}.updateBulk: rows have different keys.`);
      }
    }

    if (allVals.includes(undefined)) {
      throw new Error(`${this.name}.updateBulk: undefined value.`);
    }

    const uniqueIndex = Array.isArray(uniqueColOrIndex) ? uniqueColOrIndex : [uniqueColOrIndex];
    const indexColsSet = new Set(uniqueIndex);
    const updateCols = allCols.filter(k => !indexColsSet.has(k));
    const lastUpdateCol = TS.last(updateCols);
    if (!lastUpdateCol) {
      throw new Error(`${this.name}.updateBulk: no columns to update.`);
    }

    const query = entityQuery(this, trx ?? knexBT)
      // @ts-ignore Objection type
      .patch({
        ...fromPairs(updateCols.map(
          k => [k, raw('t.??', [k])],
        )),
        [lastUpdateCol]: raw(`
          t.??
          FROM (
            VALUES ${
              [
                `(${allCols.map(k => `?::${getValDbType(this, k, firstObj[k])}`).join(',')})`,
                ...objs.slice(1).map(_ => `(${allCols.map(_ => '?').join(',')})`),
              ]
                .join(',')
            }
          )
          t(${allCols.map(_ => '??')})
        `, [
          lastUpdateCol,
          ...allVals,
          ...allCols,
        ]),
      })
      .where(
        fromPairs(uniqueIndex.map(index => [
          `${this.tableName}.${index}`,
          raw('t.??', [index]),
        ])),
      )
      .returning('*');

    const updated = (await query) as EntityInstance<T>[];
    if (!process.env.PRODUCTION) {
      for (const ent of updated) {
        ent.$validate();
      }
    }

    const objsWithUpdated = objs.map(obj => {
      const ent = findPartialMatchingPartial(updated, uniqueIndex, obj);
      return TS.tuple(obj, ent ?? null);
    });
    if (!process.env.PRODUCTION && objsWithUpdated.length < updated.length) {
      ErrorLogger.warn(new Error(`${this.name}.updateBulk: returned entities don't match updates`));
    }

    const rc = getRC();
    await RequestContextLocalStorage.exit(
      () => Promise.all(objsWithUpdated.flatMap(([obj, ent]) => {
        if (!ent) {
          return [
            modelsCache.invalidate(rc, this, obj),
            modelIdsCache.invalidate(rc, this, obj),
          ];
        }
        return [
          modelsCache.handleUpdate(rc, this, ent),
          modelIdsCache.handleUpdate(rc, this, ent),
        ];
      })),
    );

    const updatedEnts = objsWithUpdated.map(pair => pair[1]);
    const nonNullUpdatedEnts = TS.filterNulls(updatedEnts);
    if (nonNullUpdatedEnts.length) {
      await updateLastWriteTime(this.type);
    }

    return updatedEnts;
  }

  static async delete<T extends EntityClass, P extends ModelPartialExact<T, P>>(
    this: T,
    partial: P,
    {
      trx,
    }: {
      trx?: Knex.Transaction
    } = {},
  ): Promise<EntityInstance<T> | null> {
    if (!this.deleteable) {
      throw new Error(`${this.name}.delete: not deleteable.`);
    }
    validateUniquePartial(this, partial);

    const rows = await entityQuery(this, trx ?? knexBT)
      .delete()
      .where(partial)
      .returning('*');
    if (!process.env.PRODUCTION) {
      for (const row of rows) {
        row.$validate();
      }
    }

    const deleted = rows[0] as EntityInstance<T> | undefined;
    if (!deleted) {
      return null;
    }

    const rc = getRC();
    await RequestContextLocalStorage.exit(
      () => Promise.all([
        modelsCache.handleDelete(rc, this, deleted),
        modelIdsCache.handleDelete(rc, this, deleted),
        updateLastWriteTime(this.type),
      ]),
    );

    return deleted;
  }

  static async deleteAll<T extends EntityClass, P extends ModelPartialExact<T, P>>(
    this: T,
    partial: P,
    {
      trx,
    }: {
      trx?: Knex.Transaction
    } = {},
  ): Promise<EntityInstance<T>[]> {
    if (!this.deleteable) {
      throw new Error(`${this.name}.deleteAll: not deleteable.`);
    }
    if (!process.env.PRODUCTION) {
      validateNotUniquePartial(this, partial);
    }

    const query = entityQuery(this, trx ?? knexBT)
      .delete()
      .where(partial)
      .returning('*');
    const deleted = (await query) as EntityInstance<T>[];
    if (!process.env.PRODUCTION) {
      for (const ent of deleted) {
        ent.$validate();
      }
    }

    const rc = getRC();
    await RequestContextLocalStorage.exit(
      () => Promise.all([
        ...deleted.map(ent => modelsCache.handleDelete(rc, this, ent)),
        ...deleted.map(ent => modelIdsCache.handleDelete(rc, this, ent)),
      ]),
    );
    if (deleted.length) {
      await updateLastWriteTime(this.type);
    }

    return deleted;
  }
}
