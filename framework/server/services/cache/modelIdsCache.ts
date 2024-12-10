import BaseRedisCache from 'services/cache/BaseRedisCache';
import getNonNullSchema from 'utils/models/getNonNullSchema';
import { MODEL_IDS } from 'consts/coreRedisNamespaces';
import fastJson from 'services/fastJson';
import { getModelIdsCacheKey } from './utils/getModelCacheKey';

const stringifyIds = fastJson({
  type: 'array',
  items: {
    anyOf: [
      { type: 'number' },
      { type: 'string' },
      {
        type: 'array',
        items: {
          anyOf: [
            { type: 'number' },
            { type: 'string' },
          ],
        },
      },
    ],
  },
});

const redisCache = new BaseRedisCache<(number | string | (number | string)[])[]>({
  redisNamespace: MODEL_IDS,
  serialize: ids => stringifyIds(ids),
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
  disableDataLoader: true,
});

const allColSets = new Map<ModelType, ModelKey<any>[][]>();
// Indexes + prefixes of indexes
function getCacheableColSets<T extends ModelClass>(Model: T): ModelKey<T>[][] {
  if (allColSets.has(Model.type)) {
    return allColSets.get(Model.type) as ModelKey<T>[][];
  }

  const allSchema = Model.getSchema();
  const uniqueIndexes = Model.getUniqueIndexes();
  const allIndexes = [
    ...Model.getNormalIndexes(),
    ...uniqueIndexes,
    ...Model.expressionIndexes.map(idx => (idx.cols ?? [idx.col]) as ModelIndex<typeof Model>),
  ];

  const colSets: ModelKey<T>[][] = [];
  const seen = new Set<string>();
  for (const index of allIndexes) {
    // Fetching by unique index would return only 1 row
    if ((typeof index === 'string' || index.length === 1)
      && uniqueIndexes.includes(index)) {
      continue;
    }

    const arr = Array.isArray(index) ? index : [index];
    for (let i = 0; i < arr.length; i++) {
      const { nonNullType } = getNonNullSchema(allSchema[arr[i]]);
      if (nonNullType !== 'integer' && nonNullType !== 'number' && nonNullType !== 'string') {
        break;
      }
      // Index must be multi-column, don't add full index to colSets
      if (i === arr.length - 1 && uniqueIndexes.includes(arr)) {
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

async function getIdsFromDb<T extends ModelClass>(
  Model: T,
  partial: ModelPartial<T>,
): Promise<(number | string | (number | string)[])[]> {
  const primaryIndex = Model.getPrimaryIndex();

  const rows = await modelQuery(Model).select(primaryIndex).where(partial);

  if (Array.isArray(primaryIndex)) {
    return rows.map(row => primaryIndex.map(col => {
      if (!process.env.PRODUCTION
        && typeof row[col] !== 'number'
        && typeof row[col] !== 'string') {
        throw new Error(
          `getIdsFromDb(${Model.type}): ${col} isn't a number or string`,
        );
      }
      return row[col] as unknown as number | string;
    }));
  }
  return rows.map(row => {
    if (!process.env.PRODUCTION
      && typeof row[primaryIndex] !== 'number'
      && typeof row[primaryIndex] !== 'string') {
      throw new Error(
        `getIdsFromDb(${Model.type}): ${primaryIndex} isn't a number or string`,
      );
    }
    return row[primaryIndex] as unknown as number | string;
  });
}

async function invalidateCache<T extends ModelClass>(
  rc: Nullish<RequestContext>,
  Model: T,
  partial: ModelPartial<T>,
): Promise<void> {
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
    // Ids are always cacheable
    const fromRedis = await redisCache.getWithRc(rc, cacheKey);
    if (fromRedis !== undefined) {
      return fromRedis.slice();
    }

    // Disable dataloader because odds of simultaneous requests is low
    // getModelIdsDataLoader(Model).load(partial)
    const ids = await getIdsFromDb(Model, partial);

    // Arbitrary number.
    if (!process.env.PRODUCTION && ids.length > 1000) {
      throw new Error(`modelIdsCache.get(${Model.type}): too many rows.`);
    }

    wrapPromise(
      redisCache.setWithRc(rc, cacheKey, ids),
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
