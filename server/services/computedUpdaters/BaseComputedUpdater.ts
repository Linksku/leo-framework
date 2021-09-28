import type { Knex } from 'knex';

import type ComputedUpdatersManagerType from 'services/computedUpdaters/ComputedUpdatersManager';
import { getPropWithComputed } from 'models/core/EntityComputed';
import { serializeDateProp } from 'lib/dateSchemaHelpers';
import { toMysqlDateTime } from 'lib/mysqlDate';
import redis from 'services/redis';

let ComputedUpdatersManager: typeof ComputedUpdatersManagerType | undefined;
// todo: low/mid type results columns
type UpdateIdsResults<T extends EntityModel> = readonly (readonly [
  readonly Entity[],
  readonly (InstanceKey<T> & string)[],
])[];

export const BATCHING_DELAY = 10 * 1000;
const START_TIME_BUFFER = 1000;
const BATCH_SIZE = 1000;

function createPatchUpdates<T extends EntityModel>(
  updaterName: string,
  Model: T,
  ids: EntityId[],
  results: UpdateIdsResults<T>,
) {
  const updates: Partial<Record<InstanceKey<T>, Knex.Raw<T>>> = {};
  const idsSet = new Set(ids);
  for (const [rows, cols] of results) {
    if (process.env.NODE_ENV !== 'production') {
      if (rows.length > ids.length) {
        throw new Error(`${updaterName}: got ${rows.length} rows, expecting ${ids.length} for cols = ${cols.join(',')}`);
      }
      if (rows.some(r => !idsSet.has(r.id))) {
        throw new Error(`${updaterName}: got row containing invalid ID.`);
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
          // todo: mid/easy call $toDatabaseJson on row
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

  return updates;
}

export default abstract class BaseComputedUpdater<T extends EntityModel> {
  static entityType: EntityType;
  static dependencies = [] as string[];
  static allowInserts = false;

  protected abstract getIds(startTimeStr: string): Promise<EntityId[]>;

  protected abstract updateIds(ids: EntityId[]): Promise<{
    Model: T,
    // todo: low/mid type results columns
    results: UpdateIdsResults<T>,
  }>;

  async updateOne(id: EntityId) {
    return this.updateIds([id]);
  }

  async updateMulti() {
    const redisKey = `ComputedUpdater(${(this.constructor as typeof BaseComputedUpdater).entityType}).lastRunTime`;
    const lastRunTime = TS.parseIntOrNull(await redis.get(redisKey));
    const startTime = lastRunTime && Date.now() - lastRunTime < BATCHING_DELAY
      ? lastRunTime
      : Date.now() - BATCHING_DELAY;
    redis.setex(redisKey, BATCHING_DELAY / 1000, Date.now());

    const startTimeStr = toMysqlDateTime(new Date(startTime - START_TIME_BUFFER));
    const ids = await this.getIds(startTimeStr);

    if (process.env.NODE_ENV !== 'production') {
      console.log(`${this.constructor.name}: ${ids.join(',')}`);
    }

    let totalUpdates = 0;
    let modelType: EntityType | undefined;
    // Serial for now in case of high DB load.
    for (let i = 0; i < ids.length; i += BATCH_SIZE) {
      const batchIds = ids.slice(i, i + BATCH_SIZE);
      // eslint-disable-next-line no-await-in-loop
      const { Model, results } = await this.updateIds(batchIds);
      modelType = Model.type;

      if ((this.constructor as typeof BaseComputedUpdater).allowInserts) {
        // Temp, only support 1 result
        if (results.length !== 1) {
          throw new Error(`${this.constructor.name}: more than 1 result.`);
        }
        const rows = results[0][0];
        if (!rows.every(r => TS.hasProperty(r, 'id'))) {
          throw new Error(`${this.constructor.name}: row is missing ID.`);
        }

        await Model
          .bulkInsert(
            rows.map(r => r.$toDatabaseJson() as Partial<InstanceType<T>>),
            { ignoreDuplicates: true },
          );
      } else {
        const updates = createPatchUpdates(
          this.constructor.name,
          Model,
          batchIds,
          results,
        );

        // todo: mid/mid update redis cache after updating
        // eslint-disable-next-line no-await-in-loop
        await Model.query()
          .patch(updates)
          .whereIn('id', ids);
        totalUpdates += Object.keys(updates).length;
      }
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
