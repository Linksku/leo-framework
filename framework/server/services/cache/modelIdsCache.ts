import BaseRedisCache from 'services/cache/BaseRedisCache';
import getModelIdsDataLoader from 'services/dataLoader/getModelIdsDataLoader';
import getNonNullSchema from 'utils/models/getNonNullSchema';
import { MODEL_IDS } from 'consts/coreRedisNamespaces';
import { getModelIdsCacheKey } from './utils/getModelCacheKey';

const redisCache = new BaseRedisCache<(number | string | (number | string)[])[]>({
  redisNamespace: MODEL_IDS,
  serialize: ids => JSON.stringify(ids),
  unserialize: json => {
    if (!json) {
      return undefined;
    }
    try {
      const parsed = JSON.parse(json);
      return parsed;
    } catch {
      ErrorLogger.error(new Error('modelIdsCache: data isn\'t JSON'), { json });
    }
    return undefined;
  },
  lruMaxSize: 10_000,
});

const allColSets = new Map<ModelType, ModelKey<any>[][]>();
// Indexes + prefixes of indexes
function getCacheableColSets<T extends ModelClass>(Model: T): ModelKey<T>[][] {
  if (allColSets.has(Model.type)) {
    return allColSets.get(Model.type) as ModelKey<T>[][];
  }

  const allSchema = Model.getSchema();
  const allIndexes = [
    ...Model.getNormalIndexes(),
    ...Model.getUniqueIndexes(),
    ...Model.expressionIndexes.map(idx => (idx.cols ?? [idx.col]) as ModelIndex<typeof Model>),
  ];

  const colSets: ModelKey<T>[][] = [];
  const seen = new Set<string>();
  for (const index of allIndexes) {
    const arr = Array.isArray(index) ? index : [index];
    for (let i = 0; i < arr.length; i++) {
      const { nonNullType } = getNonNullSchema(allSchema[arr[i]]);
      if (nonNullType !== 'integer' && nonNullType !== 'number' && nonNullType !== 'string') {
        break;
      }
      // Fetching by unique index would return only 1 row
      if (i === arr.length - 1 && Model.getUniqueIndexes().includes(arr)) {
        break;
      }

      const prefix = arr.slice(0, i + 1).sort();
      const prefixCombined = prefix.join(',');
      if (!seen.has(prefixCombined)) {
        seen.add(prefixCombined);
        colSets.push(prefix);
      }
    }
  }

  allColSets.set(Model.type, colSets);
  return colSets;
}

async function invalidateCache<T extends ModelClass>(
  rc: Nullish<RequestContext>,
  Model: T,
  partial: ModelPartial<T>,
): Promise<void> {
  if (!Model.cacheable) {
    return;
  }

  const colSets = getCacheableColSets(Model);
  await Promise.all(
    TS.filterNulls(
      colSets.map(colSet => {
        const obj: ModelPartial<T> = {};
        for (const col of colSet) {
          if (!partial[col]) {
            return null;
          }
          obj[col] = partial[col];
        }
        return obj;
      }))
      .map(obj => redisCache.delWithRc(
        rc,
        getModelIdsCacheKey(
          Model,
          obj,
        ),
      )),
  );
}

export default {
  async get<T extends ModelClass>(
    rc: Nullish<RequestContext>,
    Model: T,
    partial: ModelPartial<T>,
  ): Promise<(number | string | (number | string)[])[]> {
    if (!process.env.PRODUCTION) {
      const colSets = getCacheableColSets(Model);
      const partialKeys = Object.keys(partial);
      let found = false;
      for (const colSet of colSets) {
        if (partialKeys.length !== colSet.length) {
          continue;
        }
        if (colSet.every(col => TS.hasProp(partial, col))) {
          found = true;
          break;
        }
      }
      if (!found) {
        throw new Error(`modelIdsCache.get(${Model.type}): cols not allowed: ${partialKeys.join(', ')}`);
      }
    }

    const cacheKey = getModelIdsCacheKey(Model, partial);
    const fromRedis = await redisCache.getWithRc(rc, cacheKey, !Model.cacheable);
    if (fromRedis !== undefined) {
      return fromRedis.slice();
    }

    const ids = await getModelIdsDataLoader(Model).load(partial);
    // Arbitrary number.
    if (!process.env.PRODUCTION && ids.length > 10_000) {
      throw new Error(`modelIdsCache.get(${Model.type}): too many rows.`);
    }

    wrapPromise(
      redisCache.setWithRc(rc, cacheKey, ids, !Model.cacheable),
      'warn',
      `Set ${Model.type} ids after getting`,
    );
    return ids;
  },

  handleUpdate<T extends ModelClass>(
    _rc: Nullish<RequestContext>,
    _Model: T,
    _partial: ModelInstance<T>,
  ): void {
    // todo: low/mid the column we're searching by could be updated, so need to invalidate
    // E.g. find users in city -> update user city -> invalidate list
  },

  handleInsert<T extends ModelClass>(
    rc: Nullish<RequestContext>,
    Model: T,
    ent: ModelInstance<T>,
  ): Promise<void> {
    // todo: mid/hard use redis lists instead of invalidating every time
    return invalidateCache(rc, Model, ent);
  },

  handleDelete<T extends ModelClass>(
    rc: Nullish<RequestContext>,
    Model: T,
    partial: ModelPartial<T>,
  ): Promise<void> {
    return invalidateCache(rc, Model, partial);
  },

  invalidate<T extends ModelClass>(
    rc: Nullish<RequestContext>,
    Model: T,
    partial: ModelPartial<T>,
  ): Promise<void> {
    return invalidateCache(rc, Model, partial);
  },
};
