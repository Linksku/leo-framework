import QuickLRU from 'quick-lru';

import PubSubManager from 'services/PubSubManager';

export type CachedEntity<T = Entity> = {
  promise: Promise<T | null>,
  expires: number,
};

const CACHE_EXPIRE_TIME = 60 * 1000;

const lru = new QuickLRU<string, CachedEntity>({ maxSize: 10_000 });

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
  key: InstanceKey<T>,
  val: string | number,
) : string {
  return `${Model.type}:${key}=${val}`;
}

function getCacheKeyFromEntity<T extends EntityModel>(
  Model: T,
  key: InstanceKey<T> | (InstanceKey<T>)[],
  obj: Partial<InstanceType<T>>,
) : string {
  if (Array.isArray(key)) {
    const pairs = key.map(k => `${k}=${obj[k]}`);
    return `${Model.type}:${pairs.join(',')}`;
  }
  return `${Model.type}:${key}=${obj[key]}`;
}

const EntitiesCache = {
  getCacheForKV<T extends EntityModel>(
    Model: T,
    key: InstanceKey<T>,
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
    for (const key of Model.getUniqueProperties()) {
      let cacheKey: string | undefined;
      const val = typeof key === 'string' && entity[key];
      if (Array.isArray(key)) {
        if (key.every(k => entity[k])) {
          cacheKey = getCacheKeyFromEntity(Model, key, entity);
        }
      } else if (typeof val === 'string' || typeof val === 'number') {
        cacheKey = getCacheKeyFromKV(Model, key, val);
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
    key: InstanceKey<T>,
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
    for (const key of Model.getUniqueProperties()) {
      const cacheKey = getCacheKeyFromEntity(Model, key, entity);
      lru.set(cacheKey, cached);
    }
  },

  clearCacheForKV<T extends EntityModel>(
    Model: T,
    key: InstanceKey<T>,
    val: string | number,
  ): void {
    lru.delete(getCacheKeyFromKV(Model, key, val));
  },

  clearCacheForEntity<T extends EntityModel>(
    Model: T,
    entity: Partial<InstanceType<T>>,
  ): void {
    for (const key of Model.getUniqueProperties()) {
      const cacheKey = getCacheKeyFromEntity(Model, key, entity);
      lru.delete(cacheKey);
    }
  },

  invalidateCache<T extends EntityModel>(
    Model: T,
    obj: Partial<InstanceType<T>>,
  ): void {
    const cacheKeys = [] as string[];
    for (const key of Model.getUniqueProperties()) {
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
