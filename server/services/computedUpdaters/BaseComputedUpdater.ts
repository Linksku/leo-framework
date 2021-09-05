import type { Knex } from 'knex';

import type ComputedUpdatersManagerType from 'services/computedUpdaters/ComputedUpdatersManager';
import { getPropWithComputed } from 'models/core/EntityComputed';
import { serializeDateProp } from 'lib/dateSchemaHelpers';
import { toMysqlDateTime } from 'lib/mysqlDate';

let ComputedUpdatersManager: typeof ComputedUpdatersManagerType | undefined;

const BATCH_SIZE = 1000;

export default abstract class BaseComputedUpdater<T extends EntityModel> {
  static dependencies = [] as string[];

  protected abstract getIds(startTimeStr: string): Promise<EntityId[]>;

  protected abstract updateIds(ids: EntityId[]): Promise<{
    Model: T,
    // todo: low/mid type results columns
    results: readonly (readonly [
      readonly Entity[],
      readonly (InstanceKey<T> & string)[],
    ])[],
  }>;

  async updateOne(id: EntityId) {
    return this.updateIds([id]);
  }

  async updateMulti(startTime: number) {
    const startTimeStr = toMysqlDateTime(new Date(startTime));
    const ids = await this.getIds(startTimeStr);

    if (process.env.NODE_ENV !== 'production') {
      console.log(`${this.constructor.name}: ${ids.join(',')}`);
    }

    let totalUpdates = 0;
    let modelType: EntityType | undefined;
    // Serial for now in case of high DB load.
    for (let i = 0; i < ids.length; i += BATCH_SIZE) {
      const batchIds = ids.slice(i, i + BATCH_SIZE);
      const batchIdsSet = new Set(batchIds);
      const { Model, results } = await this.updateIds(batchIds);
      modelType = Model.type;

      const updates: Partial<Record<InstanceKey<T>, Knex.Raw<T>>> = {};
      for (const [rows, cols] of results) {
        if (process.env.NODE_ENV !== 'production') {
          if (rows.length > batchIds.length) {
            throw new Error(`${this.constructor.name}: got ${rows.length} rows, expecting ${batchIds.length} for cols = ${cols.join(',')}`);
          }
          if (rows.some(r => !batchIdsSet.has(r.id))) {
            throw new Error(`${this.constructor.name}: got row containing invalid ID.`);
          }
        }
        if (!rows.length) {
          continue;
        }
        for (const col of cols) {
          let query2 = '(CASE id ';
          const vals: any[] = [];
          for (const row of rows) {
            query2 += 'WHEN ? THEN ? ';
            vals.push(
              row.id,
              serializeDateProp(
                Model.dbJsonSchema,
                col,
                // @ts-ignore
                row[col],
                true,
              ),
            );
          }
          query2 += 'ELSE ?? END)';
          vals.push(getPropWithComputed(Model, col));

          updates[col] = raw(query2, vals);
        }
      }

      await Model.query()
        .patch(updates)
        .whereIn('id', ids);
      totalUpdates += Object.keys(updates).length;
    }

    if (totalUpdates && modelType) {
      if (!ComputedUpdatersManager) {
        // eslint-disable-next-line global-require
        ComputedUpdatersManager = require('services/computedUpdaters/ComputedUpdatersManager').default;
      }

      TS.defined(ComputedUpdatersManager).triggerUpdates(modelType);
    }
  }
}
