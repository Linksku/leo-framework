import type { Knex } from 'knex';

import knexBT from 'services/knex/knexBT';
import getValPgType from 'utils/db/getValPgType';
import RequestContextLocalStorage from 'services/requestContext/RequestContextLocalStorage';
import modelsCache from 'services/cache/modelsCache';
import modelIdsCache from 'services/cache/modelIdsCache';
import { updateLastWriteTime } from 'services/model/helpers/lastWriteTimeHelpers';

const MAX_BULK_UPDATES = 100;

export type UpdateBulkOpts = {
  trx?: Knex.Transaction
};

export default async function updateBulk<
  T extends EntityClass,
  Obj extends ModelPartialExact<T, Obj>,
>(
  this: T,
  uniqueColOrIndex: ModelKey<T> | ModelKey<T>[],
  objs: Obj[],
  opts?: UpdateBulkOpts,
): Promise<(EntityInstance<T> | null)[]> {
  const firstObj = objs[0];
  if (!firstObj) {
    return [];
  }
  const allCols: ModelKey<T>[] = TS.objKeys(firstObj);

  if (!process.env.PRODUCTION && objs.some(obj => {
    const keys: ModelKey<T>[] = TS.objKeys(obj);
    return keys.length !== allCols.length || keys.some(k => !allCols.includes(k));
  })) {
    throw new Error(`${this.name}.updateBulk: rows have different keys.`);
  }
  if (objs.some(obj => allCols.some(k => obj[k] === undefined))) {
    throw new Error(`${this.name}.updateBulk: undefined value.`);
  }

  const uniqueIndex = Array.isArray(uniqueColOrIndex) ? uniqueColOrIndex : [uniqueColOrIndex];
  const updateCols = allCols.filter(k => !uniqueIndex.includes(k));
  const lastUpdateCol = TS.last(updateCols);
  if (!lastUpdateCol) {
    throw new Error(`${this.name}.updateBulk: no columns to update.`);
  }

  const rc = getRC();
  const allUpdated: EntityInstance<T>[] = [];
  for (let i = 0; i < objs.length; i += MAX_BULK_UPDATES) {
    const slice = objs.slice(i, i + MAX_BULK_UPDATES);
    // eslint-disable-next-line no-await-in-loop
    const updated = await entityQuery(this, opts?.trx ?? knexBT)
      // @ts-ignore Objection type
      .patch({
        ...Object.fromEntries(updateCols.map(
          k => [k, raw('t.??', [k])],
        )),
        [lastUpdateCol]: raw(`
          t.??
          FROM (
            VALUES ${
              [
                `(${allCols.map(k => `?::${getValPgType(this, k, firstObj[k])}`).join(',')})`,
                ...objs.slice(1).map(_ => `(${allCols.map(_ => '?').join(',')})`),
              ]
                .join(',')
            }
          )
          t(${allCols.map(_ => '??').join(', ')})
        `, [
          lastUpdateCol,
          ...slice.flatMap(obj => allCols.map(k => obj[k])),
          ...allCols,
        ]),
      })
      .where(
        Object.fromEntries(uniqueIndex.map(index => [
          `${this.tableName}.${index}`,
          raw('t.??', [index]),
        ])),
      )
      .returning('*');
    if (!updated.length) {
      continue;
    }

    if (!process.env.PRODUCTION) {
      for (const ent of updated) {
        ent.$validate();
      }
    }

    // eslint-disable-next-line no-await-in-loop
    await RequestContextLocalStorage.exit(() => Promise.all([
      ...updated.map(ent => modelsCache.handleUpdate(rc, this, ent)),
      ...updated.map(ent => modelIdsCache.handleUpdate(rc, this, ent)),
      updateLastWriteTime(this.type),
    ]));
    allUpdated.push(...updated);
  }

  return allUpdated;
}
