import type { Knex } from 'knex';
import { getPropWithComputed } from 'models/core/EntityComputed';
import { serializeDbProp } from 'models/core/EntityDates';

import { toMysqlDateTime } from 'lib/mysqlDate';

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

    // Serial for now in case of high DB load.
    for (let i = 0; i < ids.length; i += BATCH_SIZE) {
      const { Model, results } = await this.updateIds(ids.slice(i, i + BATCH_SIZE));

      const updates: Partial<Record<InstanceKey<T>, Knex.Raw<T>>> = {};
      for (const [rows, cols] of results) {
        if (!rows.length) {
          continue;
        }
        for (const col of cols) {
          let query2 = '(CASE id ';
          const vals: any[] = [];
          for (const row of rows) {
            query2 += 'WHEN ? THEN ? ';
            vals.push(row.id, serializeDbProp(
              Model.dbJsonSchema,
              col,
              // @ts-ignore
              row[col],
            ));
          }
          query2 += 'ELSE ?? END)';
          vals.push(getPropWithComputed(Model, col));

          updates[col] = raw(query2, vals);
        }
      }

      await Model.query()
        .patch(updates)
        .whereIn('id', ids);
    }
  }
}
