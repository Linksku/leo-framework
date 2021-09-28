import DataLoader from 'dataloader';
import { UniqueViolationError } from 'db-errors';
import omit from 'lodash/omit';

import entitiesCache from 'services/cache/entitiesCache';
import knex from 'services/knex';
import getUniqueKeyFromEntity from 'lib/entities/getUniqueKeyFromEntity';
import filterEntityToUniqueKey from 'lib/entities/filterEntityToUniqueKey';

import EntityDates from './EntityDates';

type InsertOptions = {
  ignoreDuplicates?: boolean,
};

const MAX_BULK_INSERTS = 1000;

const dataLoaders: ObjectOf<DataLoader<
  [string, string | number] | Partial<Entity>,
  Entity | null
>> = Object.create(null);

function getDataLoader<T extends EntityModel>(
  Model: T,
): DataLoader<
  [InstanceKey<T>, string | number] | Partial<InstanceType<T>>,
  InstanceType<T> | null
> {
  if (process.env.NODE_ENV !== 'production' && !Model.type) {
    throw new Error(`getDataLoader: ${Model.constructor.name} doesn't have type.`);
  }

  if (!dataLoaders[Model.type]) {
    dataLoaders[Model.type] = new DataLoader(
      async (arr: readonly (
        [
          InstanceKey<T>,
          InstanceType<T>[InstanceKey<T>] & (string | number)
        ]
        | Partial<InstanceType<T>>
      )[]) => {
        let query = Model.query();
        for (const d of arr) {
          query = Array.isArray(d)
            ? query.orWhere(d[0], d[1])
            : query.orWhere(d);
        }
        const results = (await query) as InstanceType<T>[];
        return arr.map(
          d => results.find(r => {
            if (Array.isArray(d)) {
              return r[d[0]] === d[1];
            }

            for (const [k, v] of TS.objectEntries(d)) {
              if (r[k] !== v) {
                return false;
              }
            }
            return true;
          }) ?? null,
        );
      },
      {
        maxBatchSize: 100,
        cache: false,
      },
    );
  }
  return dataLoaders[Model.type] as DataLoader<any, InstanceType<T> | null>;
}

function validateUniquePartial<T extends EntityModel>(
  Model: T,
  partial: Partial<InstanceType<T>>,
): void {
  if (process.env.NODE_ENV === 'production') {
    return;
  }

  const entries = TS.objectEntries(partial) as [InstanceKey<T>, any][];
  const uniqueKey = getUniqueKeyFromEntity(Model, partial);
  if (!uniqueKey) {
    throw new Error(`validateUniquePartial: no unique properties for ${Model.type}: ${entries.map(e => e[0]).join(',')}`);
  }

  const extraKeys = Object.keys(omit(partial, uniqueKey));
  if (extraKeys.length) {
    throw new Error(`validateUniquePartial: partial has extraneous keys for ${Model.type}: ${extraKeys.join(',')}`);
  }

  for (const [key, val] of entries) {
    const type = Model.dbJsonSchema.properties[key]?.type;
    if ((type === 'string' && typeof val !== 'string')
      || ((type === 'number' || type === 'integer') && typeof val !== 'number')) {
      throw new Error(`validateUniquePartial: ${Model.type} ${key}=${val} (${typeof val}) doesn't match schema (${type}).`);
    }
  }
}

// todo: high/veryhard add object cache layer like tao/entql
// todo: mid/veryhard EntityLoader doesn't work with transactions
export default class EntityLoader extends EntityDates {
  static async findOne<T extends EntityModel>(
    this: T,
    _partial: Nullable<Partial<InstanceType<T>>>,
  ): Promise<InstanceType<T> | null> {
    for (const val of Object.values(_partial)) {
      // Only truthy values can be unique keys.
      if (!val) {
        return null;
      }
    }
    const partial = _partial as Partial<InstanceType<T>>;

    validateUniquePartial(this, partial);

    const cached = await entitiesCache.get(
      this,
      partial,
      async () => {
        const entity = await getDataLoader(this).load(partial);

        await Promise.all([
          ...(entity ? [entitiesCache.set(this, entity, entity)] : []),
          entitiesCache.set(this, partial, entity),
        ]);

        return entity;
      },
    );
    return cached;
  }

  static async insert<T extends EntityModel>(
    this: T,
    obj: Partial<InstanceType<T>>,
    opts?: Exclude<InsertOptions, 'ignoreDuplicates'> & {
      ignoreDuplicates?: false,
    },
  ): Promise<number>;

  // eslint-disable-next-line no-dupe-class-members
  static async insert<T extends EntityModel>(
    this: T,
    obj: Partial<InstanceType<T>>,
    opts?: Exclude<InsertOptions, 'ignoreDuplicates'> & {
      ignoreDuplicates: true,
    },
  ): Promise<number | null>;

  // eslint-disable-next-line no-dupe-class-members
  static async insert<T extends EntityModel>(
    this: T,
    obj: Partial<InstanceType<T>>,
    {
      ignoreDuplicates = false,
    }: InsertOptions = {},
  ): Promise<number | null> {
    const uniqueKey = getUniqueKeyFromEntity(this, obj);
    let cached: Nullish<InstanceType<T>>;
    if (uniqueKey) {
      const uniquePartial = filterEntityToUniqueKey(uniqueKey, obj);
      cached = await this.findOne(uniquePartial);
      if (cached) {
        if (ignoreDuplicates) {
          return null;
        }
        // @ts-ignore typings are wrong.
        throw new UniqueViolationError({
          nativeError: new Error(`${this.constructor.name}.insert: already exists entity with ${JSON.stringify(uniquePartial)}`),
          constraint: uniqueKey,
          client: 'mysql',
        });
      }
    }

    let insertedId: number;
    try {
      const res = await this.query().insert(obj);
      insertedId = res.id;
    } catch (err) {
      // If there's an UniqueViolationError, don't try to fetch using unique key.
      // E.g. if 2 users create accounts using the same email, it'll fetch the other user's account.
      if (err instanceof UniqueViolationError && ignoreDuplicates) {
        return null;
      }
      throw err;
    }

    if (cached === null) {
      await entitiesCache.del(this, obj);
      entitiesCache.invalidatePeerCache(this, obj);
    }

    return insertedId;
  }

  static async bulkInsert<T extends EntityModel>(
    this: T,
    objs: Partial<InstanceType<T>>[],
    {
      ignoreDuplicates = false,
    }: {
      ignoreDuplicates?: boolean,
    } = {},
  ): Promise<void> {
    for (let i = 0; i < objs.length; i += MAX_BULK_INSERTS) {
      const slice = objs.slice(0, MAX_BULK_INSERTS);

      ignoreDuplicates
        ? await raw(knex(this.tableName)
          .insert(slice)
          .toString().replace(/^insert/i, 'insert ignore'))
        : await knex(this.tableName)
          .insert(slice);

      for (const obj of slice) {
        await entitiesCache.del(this, obj);
        entitiesCache.invalidatePeerCache(this, obj);
      }
    }
  }

  static async patch<T extends EntityModel>(
    this: T,
    partial: Partial<InstanceType<T>>,
    obj: Partial<InstanceType<T>>,
  ): Promise<void> {
    validateUniquePartial(this, partial);

    const oldEntity = await this.findOne(partial);
    if (!oldEntity) {
      throw new Error(`${this.constructor.name}.patch: can't find entity to patch: ${JSON.stringify(partial)}`);
    }

    const affectedRows = await this.query()
      .patch(obj)
      .where(partial);

    await entitiesCache.del(this, oldEntity);
    entitiesCache.invalidatePeerCache(this, oldEntity);

    if (!affectedRows) {
      throw new Error(`${this.constructor.name}.patch: row to patch not found.`);
    }
    if (affectedRows > 1) {
      // Shouldn't be possible.
      if (process.env.NODE_ENV === 'production') {
        ErrorLogger.error(new Error(`${this.constructor.name}.patch: ${affectedRows} rows patched for ${JSON.stringify(partial)}`));
      } else {
        throw new Error(`${this.constructor.name}.patch: ${affectedRows} rows patched for ${JSON.stringify(partial)}`);
      }
    }
  }

  static async delete<T extends EntityModel>(
    this: T,
    partial: Partial<InstanceType<T>>,
  ): Promise<void> {
    validateUniquePartial(this, partial);

    const oldEntity = await this.findOne(partial);

    const affectedRows = await this.query()
      .delete()
      .where(partial);

    if (oldEntity) {
      await entitiesCache.set(this, oldEntity, null);
      entitiesCache.invalidatePeerCache(this, oldEntity);
    } else {
      await entitiesCache.set(this, partial, null);
      entitiesCache.invalidatePeerCache(this, partial);
    }

    if (affectedRows > 1) {
      // Shouldn\'t be possible.
      if (process.env.NODE_ENV === 'production') {
        ErrorLogger.error(new Error(`${this.constructor.name}.delete: ${affectedRows} rows deleted for ${JSON.stringify(partial)}`));
      } else {
        throw new Error(`${this.constructor.name}.delete: ${affectedRows} rows deleted for ${JSON.stringify(partial)}`);
      }
    }
  }

  static async deleteAll<T extends EntityModel>(
    this: T,
    partial: Partial<InstanceType<T>>,
  ): Promise<void> {
    const entities = await this.query().where(partial) as InstanceType<T>[];

    await this.query().where(partial).delete();

    if (entities) {
      await Promise.all(entities.map(async entity => {
        await entitiesCache.set(this, entity, null);
        entitiesCache.invalidatePeerCache(this, entity);
      }));
    }
  }
}
