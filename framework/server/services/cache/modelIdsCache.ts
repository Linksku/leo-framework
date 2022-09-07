import pick from 'lodash/pick';

import BaseRedisCache from 'services/cache/BaseRedisCache';
import getModelIdsDataLoader from 'services/dataLoader/getModelIdsDataLoader';
import { getModelIdsCacheKey } from './utils/getModelCacheKey';

const redisCache = new BaseRedisCache<(number | string | (number | string)[])[]>({
  redisNamespace: 'modelIds',
  serialize: ids => JSON.stringify(ids),
  unserialize: json => {
    if (!json) {
      return undefined;
    }
    try {
      const parsed = JSON.parse(json);
      return parsed;
    } catch {
      ErrorLogger.error(new Error('modelIdsCache: data isn\'t JSON'), json.slice(0, 100));
    }
    return undefined;
  },
  lruMaxSize: 10_000,
});

const allColSets: Partial<Record<ModelType, ModelIndex<any>[]>> = Object.create(null);
function getAllowedColSets<T extends ModelClass>(Model: T): ModelIndex<T>[] {
  if (TS.hasProp(allColSets, Model.type)) {
    return allColSets[Model.type] as ModelIndex<T>[];
  }

  const allSchema = Model.getSchema();
  const allIndexes = [
    ...Model.getNormalIndexes(),
    ...Model.getUniqueIndexes(),
    ...Model.expressionIndexes.map(idx => (idx.cols ?? [idx.col]) as ModelIndex<typeof Model>),
  ];

  const colSets: ModelIndex<T>[] = [];
  const seen = new Set<string>();
  for (const index of allIndexes) {
    for (let i = 0; i < index.length; i++) {
      const schema = allSchema[index[i]];
      if (schema.type !== 'integer' && schema.type !== 'number' && schema.type !== 'string') {
        break;
      }
      // Fetching by unique index would return only 1 row
      if (i === index.length - 1 && Model.getUniqueIndexes().includes(index)) {
        break;
      }

      const prefix = index.slice(0, i + 1).sort();
      const prefixCombined = prefix.join(',');
      if (!seen.has(prefixCombined)) {
        seen.add(prefixCombined);
        colSets.push(prefix);
      }
    }
  }

  allColSets[Model.type] = colSets;
  return colSets;
}

async function invalidateCache<T extends ModelClass>(
  Model: T,
  partial: ModelPartial<T>,
): Promise<void> {
  if (!Model.cacheable) {
    return;
  }

  const colSets = getAllowedColSets(Model);
  await Promise.all(
    colSets
      .filter(colSet => {
        for (const col of colSet) {
          if (!partial[col]) {
            return false;
          }
        }
        return true;
      })
      .map(colSet => redisCache.del(getModelIdsCacheKey(
        Model,
        pick(partial, colSet) as Partial<T['Interface']>,
      ))),
  );
}

export default {
  async get<T extends ModelClass>(
    Model: T,
    partial: ModelPartial<T>,
  ): Promise<(number | string | (number | string)[])[]> {
    if (!process.env.PRODUCTION) {
      const colSets = getAllowedColSets(Model);
      let found = false;
      for (const colSet of colSets) {
        if (Object.keys(partial).length !== colSet.length) {
          continue;
        }
        if (colSet.every(col => partial[col])) {
          found = true;
          break;
        }
      }
      if (!found) {
        throw new Error(`modelIdsCache.get(${Model.type}): cols not allowed: ${Object.keys(partial).join(', ')}`);
      }
    }

    const getIds = async () => {
      const rows = await getModelIdsDataLoader(Model).load(partial);

      // Arbitrary number.
      if (!process.env.PRODUCTION && rows.length > 10_000) {
        throw new Error(`modelIdsCache.get(${Model.type}): too many rows.`);
      }
      return rows;
    };

    const cacheKey = getModelIdsCacheKey(Model, partial);
    const fromRedis = await redisCache.get(cacheKey, !Model.cacheable);
    if (fromRedis !== undefined) {
      return fromRedis;
    }

    const ids = await getIds();

    wrapPromise(
      redisCache.set(cacheKey, ids, !Model.cacheable),
      'warn',
      `Set ${Model.type} ids after getting`,
    );
    return ids;
  },

  handleUpdate<T extends ModelClass>(
    _Model: T,
    _partial: ModelInstance<T>,
  ): void {
    // todo: low/mid the column we're searching by could be updated, so need to invalidate
  },

  handleInsert<T extends ModelClass>(
    Model: T,
    ent: ModelInstance<T>,
  ): Promise<void> {
    // todo: mid/hard use redis lists instead of invalidating every time
    return invalidateCache(Model, ent);
  },

  handleDelete<T extends ModelClass>(
    Model: T,
    partial: ModelPartial<T>,
  ): Promise<void> {
    return invalidateCache(Model, partial);
  },

  invalidate<T extends ModelClass>(
    Model: T,
    partial: ModelPartial<T>,
  ): Promise<void> {
    return invalidateCache(Model, partial);
  },
};
