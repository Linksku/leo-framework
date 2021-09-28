import type EntityTypeToModelType from 'lib/entityTypeToModel';
import getUniqueKeyFromEntity from 'lib/entities/getUniqueKeyFromEntity';
import BaseRedisCache from './BaseRedisCache';

let entityTypeToModel: typeof EntityTypeToModelType | undefined;

function getCacheKey<T extends EntityModel>(
  Model: T,
  key: InstanceKey<T> | (InstanceKey<T>)[],
  obj: Partial<InstanceType<T>>,
): string {
  if (Array.isArray(key)) {
    const pairs = key.map(k => `${k}=${obj[k]}`);
    return `${Model.type}:${pairs.join(',')}`;
  }
  return `${Model.type}:${key}=${obj[key]}`;
}

function doesPartialContainKey(partial: ObjectOf<any>, key: string | string[]): boolean {
  if (Array.isArray(key)) {
    return key.every(k => partial[k]);
  }
  return partial[key];
}

const redisCache = new BaseRedisCache<Entity | null>({
  redisNamespace: 'ent',
  serialize: entity => (entity
    ? JSON.stringify(entity.toJSON({ shallow: true }))
    : 'null'),
  unserialize: (json, key) => {
    if (!json) {
      return undefined;
    }
    if (json === 'null') {
      return null;
    }
    const entityType = key.split(':', 1)[0] as EntityType | undefined;
    if (!entityType) {
      return undefined;
    }

    if (!entityTypeToModel) {
      // eslint-disable-next-line global-require
      entityTypeToModel = require('lib/entityTypeToModel').default;
    }
    const Model = TS.defined(entityTypeToModel)[entityType];
    try {
      const parsed = JSON.parse(json);
      return Model.fromJson(parsed, {
        skipValidation: true,
      });
    } catch {}
    return undefined;
  },
  redisTtl: 10 * 60 * 1000,
  lruTtl: 60 * 1000,
  lruMaxSize: 10_000,
});

const entitiesCache = {
  async get<T extends EntityModel>(
    Model: T,
    partial: Partial<InstanceType<T>>,
    fetchFromDb: () => Promise<InstanceType<T> | null>,
  ): Promise<InstanceType<T> | null> {
    const uniqueKey = getUniqueKeyFromEntity(Model, partial);
    if (!uniqueKey) {
      return null;
    }
    const cacheKey = getCacheKey(Model, uniqueKey, partial);
    const cached = await redisCache.getOrSet(cacheKey, fetchFromDb);
    return cached as InstanceType<T> | null;
  },

  async set<T extends EntityModel>(
    Model: T,
    partial: Partial<InstanceType<T>>,
    entity: InstanceType<T> | null,
  ): Promise<void> {
    const promises: Promise<void>[] = [];
    for (const key of Model.getUniqueProperties()) {
      if (!doesPartialContainKey(partial, key)) {
        continue;
      }

      const cacheKey = getCacheKey(Model, key, partial);
      promises.push(redisCache.set(cacheKey, entity));
    }

    await Promise.all(promises);
  },

  // If an entity is deleted, use set(null).
  async del<T extends EntityModel>(
    Model: T,
    partial: Partial<InstanceType<T>>,
  ): Promise<void> {
    const promises: Promise<void>[] = [];
    for (const key of Model.getUniqueProperties()) {
      if (!doesPartialContainKey(partial, key)) {
        continue;
      }

      const cacheKey = getCacheKey(Model, key, partial);
      promises.push(redisCache.del(cacheKey));
    }

    await Promise.all(promises);
  },

  invalidatePeerCache<T extends EntityModel>(
    Model: T,
    partial: Partial<InstanceType<T>>,
  ): void {
    for (const key of Model.getUniqueProperties()) {
      if (!doesPartialContainKey(partial, key)) {
        continue;
      }

      redisCache.invalidatePeerCache(getCacheKey(Model, key, partial));
    }
  },
};

export default entitiesCache;
