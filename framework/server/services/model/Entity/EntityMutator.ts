import fromPairs from 'lodash/fromPairs';

import modelsCache from 'services/cache/modelsCache';
import modelIdsCache from 'services/cache/modelIdsCache';
import validateUniquePartial from 'utils/models/validateUniquePartial';
import validateNotUniquePartial from 'utils/models/validateNotUniquePartial';
import findPartialMatchingPartial from 'utils/models/findPartialMatchingPartial';
import getValDbType from 'utils/db/getValDbType';
import knexBT from 'services/knex/knexBT';
import BaseEntity from './BaseEntity';

import insert from './methods/insert';
import insertBulk from './methods/insertBulk';

// todo: mid/veryhard EntityLoader doesn't work with transactions
// todo: mid/mid add count function
export default class EntityMutator extends BaseEntity {
  static insert = insert;

  static insertBulk = insertBulk;

  static async update<T extends EntityClass>(
    this: T,
    partial: ModelPartial<T>,
    obj: ModelPartial<T>,
  ): Promise<EntityInstance<T> | null> {
    validateUniquePartial(this, partial);

    const rows = await entityQuery(this, knexBT)
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
    const updated = rows[0] as EntityInstance<T> | undefined;
    if (!updated) {
      // Row doesn't exist, maybe delete from cache instead.
      await Promise.all([
        modelsCache.invalidate(this, obj),
        modelIdsCache.invalidate(this, obj),
      ]);
      return null;
    }

    await Promise.all([
      modelsCache.handleUpdate(this, updated),
      modelIdsCache.handleUpdate(this, updated),
    ]);
    return updated;
  }

  static async updateBulk<T extends EntityClass>(
    this: T,
    uniqueColOrIndex: ModelKey<T> | ModelKey<T>[],
    objs: ModelPartial<T>[],
  ): Promise<(EntityInstance<T> | null)[]> {
    const firstObj = objs[0];
    if (!firstObj) {
      return [];
    }
    const allCols = TS.objKeys(firstObj);
    const uniqueIndex = Array.isArray(uniqueColOrIndex) ? uniqueColOrIndex : [uniqueColOrIndex];
    const indexColsSet = new Set(uniqueIndex);
    const updateCols = allCols.filter(k => !indexColsSet.has(k));
    const allVals: any[] = objs.flatMap(obj => allCols.map(k => obj[k]));

    if (!process.env.PRODUCTION) {
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

    const query = entityQuery(this, knexBT)
      // @ts-ignore Objection type
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
        fromPairs(uniqueIndex.map(index => [
          `${this.tableName}.${index}`,
          raw(`t.??::${getValDbType(this, index, firstObj[index])}`, [index]),
        ])),
      )
      .returning('*');

    const updated = (await query) as EntityInstance<T>[];
    const objsWithUpdated = objs.map(obj => {
      const ent = findPartialMatchingPartial(updated, uniqueIndex, obj);
      return TS.tuple(obj, ent ?? null);
    });

    await Promise.all(objsWithUpdated.flatMap(([obj, ent]) => {
      if (!ent) {
        return [
          modelsCache.invalidate(this, obj),
          modelIdsCache.invalidate(this, obj),
        ];
      }
      return [
        modelsCache.handleUpdate(this, ent),
        modelIdsCache.handleUpdate(this, ent),
      ];
    }));

    return objsWithUpdated.map(pair => pair[1]);
  }

  static async delete<T extends EntityClass>(
    this: T,
    partial: ModelPartial<T>,
  ): Promise<EntityInstance<T> | null> {
    validateUniquePartial(this, partial);

    const rows = await entityQuery(this, knexBT)
      .delete()
      .where(partial)
      .returning('*');
    const deleted = rows[0] as EntityInstance<T> | undefined;
    if (!deleted) {
      return null;
    }

    await Promise.all([
      modelsCache.handleDelete(this, deleted),
      modelIdsCache.handleDelete(this, deleted),
    ]);
    return deleted;
  }

  static async deleteAll<T extends EntityClass>(
    this: T,
    partial: ModelPartial<T>,
  ): Promise<EntityInstance<T>[]> {
    validateNotUniquePartial(this, partial);

    const query = entityQuery(this, knexBT)
      .delete()
      .where(partial)
      .returning('*');
    const deleted = (await query) as EntityInstance<T>[];
    await Promise.all([
      ...deleted.map(ent => modelsCache.handleDelete(this, ent)),
      ...deleted.map(ent => modelIdsCache.handleDelete(this, ent)),
    ]);
    return deleted;
  }
}
