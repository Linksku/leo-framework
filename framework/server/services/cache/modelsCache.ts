import getPartialUniqueIndex from 'utils/models/getPartialUniqueIndex';
import getPartialAllUniqueIndexes from 'utils/models/getPartialAllUniqueIndexes';
import getModelDataLoader from 'services/dataLoader/getModelDataLoader';
import { MODEL_INSTANCE } from 'consts/coreRedisNamespaces';
import BaseRedisCache from './BaseRedisCache';
import { getModelCacheKey } from './utils/getModelCacheKey';

function onlyLocalCache<T extends ModelClass>(Model: T, index: ModelIndex<T>): boolean {
  if (!Model.cacheable) {
    return true;
  }

  if (Model.isEntity) {
    // Don't cache non-id columns to Redis because cache invalidation is unreliable
    if (Array.isArray(index)) {
      return index.length !== 1 || index[0] !== 'id';
    }
    return index !== 'id';
  }

  return false;
}

export const redisCache = new BaseRedisCache<Model | null>({
  redisNamespace: MODEL_INSTANCE,
  serialize: instance => {
    if (!instance) {
      return 'null';
    }

    const Model = instance.constructor as ModelClass;
    return Model.stringify(instance.$toCachePojo());
  },
  unserialize: (json, key) => {
    if (!json) {
      return undefined;
    }
    if (json === 'null') {
      return null;
    }
    const modelType = key.split('.', 1)[0] as ModelType | undefined;
    if (!modelType) {
      return undefined;
    }

    const Model = getModelClass(modelType);
    let parsed: any;
    try {
      parsed = JSON.parse(json);
    } catch {
      ErrorLogger.error(
        new Error(`modelsCache(${key}): data isn't JSON`),
        { json },
      );
      return undefined;
    }
    return Model.fromCachePojo(parsed);
  },
  lruMaxSize: 10_000,
});

async function set<T extends ModelClass>(
  rc: Nullish<RequestContext>,
  Model: T,
  ent: ModelInstance<T>,
): Promise<void> {
  try {
    await Promise.all(Model.getUniqueIndexes().map(
      index => redisCache.setWithRc(
        rc,
        getModelCacheKey(Model, index, ent),
        ent,
        onlyLocalCache(Model, index),
      ),
    ));
  } catch (err) {
    ErrorLogger.warn(err, { ctx: `modelsCache.set(${Model.type})` });
  }
}

async function setNull<T extends ModelClass>(
  rc: Nullish<RequestContext>,
  Model: T,
  partial: ModelPartial<T>,
): Promise<void> {
  try {
    await Promise.all(getPartialAllUniqueIndexes(Model, partial).map(
      index => redisCache.setWithRc(
        rc,
        getModelCacheKey(Model, index, partial),
        null,
        onlyLocalCache(Model, index),
      ),
    ));
  } catch (err) {
    ErrorLogger.warn(err, { ctx: `modelsCache.setNull(${Model.type})` });
  }
}

export default {
  async get<T extends ModelClass>(
    rc: Nullish<RequestContext>,
    Model: T,
    partial: ModelPartial<T>,
  ): Promise<Readonly<ModelInstance<T>> | null> {
    const uniqueIndex = getPartialUniqueIndex(Model, partial);
    if (!uniqueIndex) {
      return null;
    }

    const cacheKey = getModelCacheKey(Model, uniqueIndex, partial);
    const fromRedis = await redisCache.getWithRc(
      rc,
      cacheKey,
      onlyLocalCache(Model, uniqueIndex),
    );
    if (fromRedis !== undefined) {
      return fromRedis;
    }

    // todo: low/med errors may be cached and reused, causing long debugCtx
    const instance = await getModelDataLoader(Model).load(partial);
    if (instance) {
      wrapPromise(
        set(rc, Model, instance),
        'warn',
        `modelsCache.get(${Model.type}) with instance`,
      );
    } else {
      wrapPromise(
        setNull(rc, Model, partial),
        'warn',
        `modelsCache.get(${Model.type}) without instance`,
      );
    }

    return instance;
  },

  handleUpdate<T extends ModelClass>(
    rc: Nullish<RequestContext>,
    Model: T,
    ent: ModelInstance<T>,
  ): Promise<void> {
    return set(rc, Model, ent);
  },

  handleInsert<T extends ModelClass>(
    rc: Nullish<RequestContext>,
    Model: T,
    ent: ModelInstance<T>,
  ): Promise<void> {
    return set(rc, Model, ent);
  },

  handleDelete<T extends ModelClass>(
    rc: Nullish<RequestContext>,
    Model: T,
    partial: ModelPartial<T>,
  ): Promise<void> {
    return setNull(rc, Model, partial);
  },

  async invalidate<T extends ModelClass>(
    rc: Nullish<RequestContext>,
    Model: T,
    partial: ModelPartial<T>,
  ): Promise<void> {
    if (!Model.cacheable) {
      return;
    }

    const allCacheKeys = getPartialAllUniqueIndexes(Model, partial)
      .map(index => getModelCacheKey(Model, index, partial));
    try {
      await Promise.all(allCacheKeys.map(key => redisCache.delWithRc(rc, key)));
    } catch (err) {
      ErrorLogger.warn(err, { ctx: `modelsCache.invalidate(${Model.type})` });
    }
  },
};
