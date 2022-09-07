import fromPairs from 'lodash/fromPairs';

import modelsCache from 'services/cache/modelsCache';
import modelIdsCache from 'services/cache/modelIdsCache';
import validateUniquePartial from 'utils/models/validateUniquePartial';
import validateNotUniquePartial from 'utils/models/validateNotUniquePartial';
import findPartialMatchingPartial from 'utils/models/findPartialMatchingPartial';
import getValDbType from 'utils/db/getValDbType';
import knexBT from 'services/knex/knexBT';
import { updateLastWriteTime } from 'services/model/helpers/lastWriteTimeHelpers';
import waitForRRUpdate from 'utils/models/waitForRRUpdate';
import BaseEntity from './BaseEntity';

import insert from './methods/insert';
import insertBulk from './methods/insertBulk';

// todo: mid/veryhard EntityLoader doesn't work with transactions
// todo: mid/mid add cached count method
export default class EntityMutator extends BaseEntity {
  static insert = insert;

  static insertBulk = insertBulk;

  static async update<T extends EntityClass>(
    this: T,
    partial: ModelPartial<T>,
    obj: ModelPartial<T>,
    { waitForRR }: {
      waitForRR?: boolean,
    } = {},
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
    if (!process.env.PRODUCTION) {
      for (const row of rows) {
        row.$validate();
      }
    }

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
      updateLastWriteTime(this.type),
    ]);
    if (waitForRR) {
      await waitForRRUpdate(this, updated.id, updated.version);
    }
    return updated;
  }

  static async updateBulk<T extends EntityClass>(
    this: T,
    uniqueColOrIndex: ModelKey<T> | ModelKey<T>[],
    objs: ModelPartial<T>[],
    { waitForRR }: {
      waitForRR?: boolean,
    } = {},
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
          k => [k, raw('t.??', [k])],
        )),
        version: raw(`
          case
            when version + 1 >= 32767 then 1
            else version + 1
          end
          from (
            values ${
              [
                `(${allCols.map(k => `?::${getValDbType(this, k, firstObj[k])}`).join(',')})`,
                ...objs.slice(1).map(_ => `(${allCols.map(_ => '?').join(',')})`),
              ]
                .join(',')
            }
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

    const updatedEnts = objsWithUpdated.map(pair => pair[1]);
    const nonNullUpdatedEnts = TS.filterNulls(updatedEnts);
    if (nonNullUpdatedEnts.length) {
      await updateLastWriteTime(this.type);
      if (waitForRR) {
        const last = nonNullUpdatedEnts[nonNullUpdatedEnts.length - 1];
        await waitForRRUpdate(this, last.id, last.version);
      }
    }

    return updatedEnts;
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
    if (!process.env.PRODUCTION) {
      for (const row of rows) {
        row.$validate();
      }
    }

    const deleted = rows[0] as EntityInstance<T> | undefined;
    if (!deleted) {
      return null;
    }

    await Promise.all([
      modelsCache.handleDelete(this, deleted),
      modelIdsCache.handleDelete(this, deleted),
      updateLastWriteTime(this.type),
    ]);

    return deleted;
  }

  static async deleteAll<T extends EntityClass>(
    this: T,
    partial: ModelPartial<T>,
  ): Promise<EntityInstance<T>[]> {
    if (!process.env.PRODUCTION) {
      validateNotUniquePartial(this, partial);
    }

    const query = entityQuery(this, knexBT)
      .delete()
      .where(partial)
      .returning('*');
    const deleted = (await query) as EntityInstance<T>[];
    if (!process.env.PRODUCTION) {
      for (const ent of deleted) {
        ent.$validate();
      }
    }

    await Promise.all([
      ...deleted.map(ent => modelsCache.handleDelete(this, ent)),
      ...deleted.map(ent => modelIdsCache.handleDelete(this, ent)),
    ]);
    if (deleted.length) {
      await updateLastWriteTime(this.type);
    }

    return deleted;
  }
}
