import DataLoader from 'dataloader';
import QuickLRU from 'quick-lru';
import PubSubManager from 'services/PubSubManager';

import redis from 'services/redis';

export type ConstructorProps<T> = {
  redisNamespace: string,
  serialize: (val: T) => string,
  unserialize: (val: string | undefined, key: string) => T | undefined,
  redisTtl: number,
  lruTtl: number,
  lruMaxSize: number,
};

const INVALIDATE_EVENT_NAME = 'invalidatePeerCache';

export default class BaseRedisCache<T> {
  private getDataLoader: DataLoader<string, T | undefined>;

  private setDataLoader: DataLoader<[string, T], void>;

  private delDataLoader: DataLoader<string, void>;

  private invalidateDataLoader: DataLoader<string, void>;

  private lru: QuickLRU<string, T | Promise<T>>;

  constructor({
    redisNamespace,
    serialize,
    unserialize,
    redisTtl,
    lruTtl,
    lruMaxSize,
  }: ConstructorProps<T>) {
    this.getDataLoader = new DataLoader<string, T | undefined>(
      async (keys: readonly string[]) => {
        const results = await redis.mget(keys.map(k => `${redisNamespace}:${k}`));
        return results.map((val, idx) => unserialize(val ?? undefined, keys[idx]));
      },
      {
        maxBatchSize: 1000,
        cache: false,
      },
    );

    this.setDataLoader = new DataLoader<[string, T], void>(
      async (kvPairs: readonly [string, T][]) => {
        const pipeline = redis.pipeline();
        for (const pair of kvPairs) {
          pipeline.setex(
            `${redisNamespace}:${pair[0]}`,
            redisTtl / 1000,
            serialize(pair[1]),
          );
        }
        await pipeline.exec();
        return Array.from({ length: kvPairs.length }, _ => undefined);
      },
      {
        maxBatchSize: 1000,
        cache: false,
      },
    );

    this.delDataLoader = new DataLoader<string, void>(
      async (keys: readonly string[]) => {
        await redis.del(keys.map(k => `${redisNamespace}:${k}`));
        return Array.from({ length: keys.length }, _ => undefined);
      },
      {
        maxBatchSize: 1000,
        cache: false,
      },
    );

    PubSubManager.subscribe(`${redisNamespace}:${INVALIDATE_EVENT_NAME}`, (data: string) => {
      try {
        const cacheKeys = JSON.parse(data);
        for (const key of cacheKeys) {
          this.lru.delete(key);
        }
      } catch {}
    });

    this.invalidateDataLoader = new DataLoader<string, void>(
      async (keys: readonly string[]) => {
        PubSubManager.publish(`${redisNamespace}:${INVALIDATE_EVENT_NAME}`, JSON.stringify(keys));
        return Promise.resolve(Array.from({ length: keys.length }, _ => undefined));
      },
      {
        maxBatchSize: 1000,
        cache: false,
      },
    );

    this.lru = new QuickLRU<string, T | Promise<T>>({
      maxSize: lruMaxSize,
      maxAge: lruTtl,
    });
  }

  async getOrSet(key: string, fetchValue: () => Promise<T>): Promise<T> {
    const cachedFromLru = this.lru.get(key);
    if (cachedFromLru !== undefined) {
      return cachedFromLru;
    }

    const promise = (async () => {
      const cachedFromRedis = await this.getDataLoader.load(key);
      if (cachedFromRedis !== undefined) {
        return cachedFromRedis;
      }

      return fetchValue();
    })();
    this.lru.set(key, promise);
    const val = await promise;
    this.lru.set(key, val);
    void this.setDataLoader.load([key, val]);

    return val;
  }

  async set(key: string, val: T) {
    this.lru.set(key, val);
    await this.setDataLoader.load([key, val]);
    this.lru.set(key, val);
  }

  async del(key: string) {
    this.lru.delete(key);
    await this.delDataLoader.load(key);
    this.lru.delete(key);
  }

  invalidatePeerCache(key: string) {
    void this.invalidateDataLoader.load(key);
  }
}
