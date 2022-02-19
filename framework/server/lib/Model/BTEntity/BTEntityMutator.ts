import fromPairs from 'lodash/fromPairs';

import modelsCache from 'services/cache/modelsCache';
import modelIdsCache from 'services/cache/modelIdsCache';
import validateUniquePartial from 'lib/modelUtils/validateUniquePartial';
import validateNotUniquePartial from 'lib/modelUtils/validateNotUniquePartial';
import findPartialMatchingPartial from 'lib/modelUtils/findPartialMatchingPartial';
import getValDbType from 'lib/dbUtils/getValDbType';
import type { BTEntityClass } from './BTEntity';
import Entity from '../Entity';

import insert from './insert';
import insertBulk from './insertBulk';

// todo: high/veryhard add object cache layer like tao/entql
// todo: mid/veryhard EntityLoader doesn't work with transactions
// todo: mid/mid add count function
export default class BTEntityMutator extends Entity {
  static insert = insert;

  static insertBulk = insertBulk;

  static async update<T extends BTEntityClass>(
    this: T,
    partial: ModelPartial<T>,
    obj: ModelPartial<T>,
  ): Promise<InstanceType<T> | null> {
    validateUniquePartial(this, partial);

    const rows = await this.query()
      .patch({
        // 32767 is max smallint size.
        version: raw(`
          case
            when version + 1 >= 32767 then 1
            else version + 1
          end
        `),
        ...obj,
      })
      .where(partial)
      .returning('*');
    const updated = rows[0] as InstanceType<T> | undefined;
    if (!updated) {
      // Row doesn't exist, maybe delete from cache instead.
      await Promise.all([
        modelsCache.invalidate(this, obj),
        modelsCache.invalidate(this.getMVModelClass(), obj),
        modelIdsCache.invalidate(this, obj),
        modelIdsCache.invalidate(this.getMVModelClass(), obj),
      ]);
      return null;
    }

    await Promise.all([
      modelsCache.handleUpdate(this, updated),
      modelIdsCache.handleUpdate(this, updated),
      // Can't get updated MV without waiting for Materialize to update.
      modelsCache.invalidate(this.getMVModelClass(), updated),
    ]);
    return updated;
  }

  static async updateBulk<T extends BTEntityClass>(
    this: T,
    uniqueIndex: ModelIndex<T>,
    objs: ModelPartial<T>[],
  ): Promise<(InstanceType<T> | null)[]> {
    const firstObj = objs[0];
    if (!firstObj) {
      return [];
    }
    const allCols = TS.objKeys(firstObj);
    const indexColsSet = new Set(Array.isArray(uniqueIndex) ? uniqueIndex : [uniqueIndex]);
    const updateCols = allCols.filter(k => !indexColsSet.has(k));
    const allVals: any[] = objs.flatMap(obj => allCols.map(k => obj[k]));

    if (process.env.NODE_ENV !== 'production') {
      const allColsSet = new Set(allCols);
      if (objs.some(obj => {
        const keys = TS.objKeys(obj);
        return keys.length !== allColsSet.size || keys.some(k => !allColsSet.has(k));
      })) {
        throw new Error(`${this.name}.updateBulk: rows have different keys.`);
      }
    }

    if (allVals.includes(undefined)) {
      throw new Error(`${this.name}.updateBulk: undefined value.`);
    }

    const query = this.query()
      .patch({
        ...fromPairs(updateCols.map(
          k => [k, raw(`t.??::${getValDbType(this, k, firstObj[k])}`, [k])],
        )),
        version: raw(`
          case
            when version + 1 >= 32767 then 1
            else version + 1
          end
          from (
            values ${objs.map(_ => `(${allCols.map(_ => '?').join(',')})`).join(',')}
          )
          t(${allCols.map(_ => '??')})
        `, [
          ...allVals,
          ...allCols,
        ]),
      })
      .where(
        Array.isArray(uniqueIndex)
          ? fromPairs(uniqueIndex.map(index => [
            `${this.tableName}.${index}`,
            raw(`t.??::${getValDbType(this, index, firstObj[index])}`, [index]),
          ]))
          : {
            [`${this.tableName}.${uniqueIndex}`]: raw(
              `t.??::${getValDbType(this, uniqueIndex, firstObj[uniqueIndex])}`,
              [uniqueIndex],
            ),
          },
      )
      .returning('*');

    const updated = (await query) as InstanceType<T>[];
    const objsWithUpdated = objs.map(obj => {
      const ent = findPartialMatchingPartial(updated, uniqueIndex, obj);
      return TS.tuple(obj, ent ?? null);
    });

    await Promise.all(objsWithUpdated.flatMap(([obj, ent]) => {
      if (!ent) {
        return [
          modelsCache.invalidate(this, obj),
          modelsCache.invalidate(this.getMVModelClass(), obj),
          modelIdsCache.invalidate(this, obj),
          modelIdsCache.invalidate(this.getMVModelClass(), obj),
        ];
      }
      return [
        modelsCache.handleUpdate(this, ent),
        modelIdsCache.handleUpdate(this, ent),
        modelsCache.invalidate(this.getMVModelClass(), ent),
      ];
    }));

    return objsWithUpdated.map(pair => pair[1]);
  }

  static async delete<T extends BTEntityClass>(
    this: T,
    partial: ModelPartial<T>,
  ): Promise<InstanceType<T> | null> {
    validateUniquePartial(this, partial);

    const rows = await this.query()
      .delete()
      .where(partial)
      .returning('*');
    const deleted = rows[0] as InstanceType<T> | undefined;
    if (!deleted) {
      return null;
    }

    await Promise.all([
      modelsCache.handleDelete(this, deleted),
      modelIdsCache.handleDelete(this, deleted),
      modelsCache.handleDelete(this.getMVModelClass(), deleted),
      modelIdsCache.handleDelete(this.getMVModelClass(), deleted),
    ]);
    return deleted;
  }

  static async deleteAll<T extends BTEntityClass>(
    this: T,
    partial: ModelPartial<T>,
  ): Promise<InstanceType<T>[]> {
    validateNotUniquePartial(this, partial);

    const query = this.query()
      .delete()
      .where(partial)
      .returning('*');
    const deleted = (await query) as InstanceType<T>[];
    await Promise.all([
      ...deleted.map(ent => modelsCache.handleDelete(this, ent)),
      ...deleted.map(ent => modelIdsCache.handleDelete(this, ent)),
      ...deleted.map(ent => modelsCache.handleDelete(this.getMVModelClass(), ent)),
      ...deleted.map(ent => modelIdsCache.handleDelete(this.getMVModelClass(), ent)),
    ]);
    return deleted;
  }
}
