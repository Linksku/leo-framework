import QuickLRU from 'quick-lru';

import PubSubManager from 'services/PubSubManager';

export type CachedEntity<T = Entity> = {
  promise: Promise<T | null>,
  expires: number,
};

const CACHE_EXPIRE_TIME = 60 * 1000;

const lru = new QuickLRU<string, CachedEntity>({ maxSize: 10000 });

PubSubManager.subscribe('invalidateEntityCache', (data: string) => {
  try {
    const cacheKeys = JSON.parse(data);
    for (const key of cacheKeys) {
      lru.delete(key);
    }
  } catch {}
});

function getCacheKeyFromKV<T extends EntityModel>(
  Model: T,
  key: string,
  val: string | number,
) : string {
  return `${Model.type}:${key}=${val}`;
}

function getCacheKeyFromEntity<T extends EntityModel>(
  Model: T,
  key: string | string[],
  obj: Partial<InstanceType<T>>,
) : string {
  if (typeof key === 'string') {
    return `${Model.type}:${key}=${obj[key]}`;
  }
  const pairs = key.map(k => `${k}=${obj[k]}`);
  return `${Model.type}:${pairs.join(',')}`;
}

const EntitiesCache = {
  getCacheForKV<T extends EntityModel>(
    Model: T,
    key: string,
    val: string | number,
  ): Promise<InstanceType<T> | null> | null {
    const cacheKey = getCacheKeyFromKV(Model, key, val);
    const cached = lru.get(cacheKey) as CachedEntity<InstanceType<T>> | undefined;
    if (!cached || cached.expires < Date.now()) {
      return null;
    }
    return cached.promise;
  },

  getCacheForEntity<T extends EntityModel>(
    Model: T,
    entity: Partial<InstanceType<T>>,
  ): Promise<InstanceType<T> | null> | null {
    for (const key of Model.uniqueProperties) {
      let cacheKey;
      if (typeof key === 'string' && entity[key]) {
        cacheKey = getCacheKeyFromKV(Model, key, entity[key]);
      } else if (Array.isArray(key) && key.every(k => entity[k])) {
        cacheKey = getCacheKeyFromEntity(Model, key, entity);
      }

      if (cacheKey) {
        const cached = lru.get(cacheKey) as CachedEntity<InstanceType<T>> | undefined;
        if (!cached || cached.expires < Date.now()) {
          return null;
        }
        return cached.promise;
      }
    }
    return null;
  },

  setCacheForKV<T extends EntityModel>(
    Model: T,
    key: string,
    val: string | number,
    promise: Promise<InstanceType<T> | null>,
  ): void {
    const cached = {
      promise,
      expires: Date.now() + CACHE_EXPIRE_TIME,
    };
    const cacheKey = getCacheKeyFromKV(Model, key, val);
    lru.set(cacheKey, cached);
  },

  setCacheForEntity<T extends EntityModel>(
    Model: T,
    entity: Partial<InstanceType<T>>,
    promise: Promise<InstanceType<T> | null>,
  ): void {
    const cached = {
      promise,
      expires: Date.now() + CACHE_EXPIRE_TIME,
    };
    for (const key of Model.uniqueProperties) {
      const cacheKey = getCacheKeyFromEntity(Model, key, entity);
      lru.set(cacheKey, cached);
    }
  },

  clearCacheForKV<T extends EntityModel>(
    Model: T,
    key: string,
    val: string | number,
  ): void {
    lru.delete(getCacheKeyFromKV(Model, key, val));
  },

  clearCacheForEntity<T extends EntityModel>(
    Model: T,
    entity: Partial<InstanceType<T>>,
  ): void {
    for (const key of Model.uniqueProperties) {
      const cacheKey = getCacheKeyFromEntity(Model, key, entity);
      lru.delete(cacheKey);
    }
  },

  invalidateCache<T extends EntityModel>(
    Model: T,
    obj: Partial<InstanceType<T>>,
  ): void {
    const cacheKeys = [] as string[];
    for (const key of Model.uniqueProperties) {
      cacheKeys.push(getCacheKeyFromEntity(Model, key, obj));
    }

    if (cacheKeys.length) {
      PubSubManager.publish('invalidateEntityCache', JSON.stringify(cacheKeys));
    } else {
      console.error(`Can't invalidate cache for ${JSON.stringify(obj)}`);
    }
  },
};

export default EntitiesCache;
