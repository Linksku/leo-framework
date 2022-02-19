import DataLoader from 'dataloader';
import QuickLRU from 'quick-lru';

import redis from 'services/redis';
import RedisDataLoader from 'lib/redis/RedisDataLoader';
import { MAX_CACHE_TTL } from 'serverSettings';

export type ConstructorProps<T> = {
  redisNamespace: string,
  serialize: (val: T) => string,
  unserialize: (val: string | undefined, key: string) => T | undefined,
  redisTtl?: number,
  lruTtl?: number,
  lruMaxSize: number,
};

export default class BaseRedisCache<T> {
  private redisNamespace: string;

  private getDataLoader: DataLoader<string, T | undefined>;

  private setDataLoader: RedisDataLoader<'setex', [string, T], void>;

  private delDataLoader: RedisDataLoader<'del', string, void>;

  // todo: mid/mid make lru content readonly
  private lru: QuickLRU<string, T | undefined | Promise<T | undefined>>;

  constructor({
    redisNamespace,
    serialize,
    unserialize,
    redisTtl = MAX_CACHE_TTL,
    // LRU is mostly to avoid concurrently fetching same thing, keep short to enough to not need invalidation
    lruTtl = 10 * 1000,
    lruMaxSize,
  }: ConstructorProps<T>) {
    this.redisNamespace = redisNamespace;

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

    this.setDataLoader = new RedisDataLoader(
      'setex',
      (kv: [string, T]) => [
        `${redisNamespace}:${kv[0]}`,
        redisTtl / 1000,
        serialize(kv[1]),
      ],
    );

    this.delDataLoader = new RedisDataLoader(
      'del',
      (k: string) => [
        `${redisNamespace}:${k}`,
      ],
    );

    this.lru = new QuickLRU<string, T | Promise<T>>({
      maxSize: lruMaxSize,
      maxAge: lruTtl,
    });
  }

  async get(key: string): Promise<T | undefined> {
    const rc = getRC();
    const cachedFromRc = rc?.cache.get(
      `${this.redisNamespace}:${key}`,
    );
    if (cachedFromRc) {
      return cachedFromRc;
    }

    const cachedFromLru = this.lru.get(key);
    if (cachedFromLru !== undefined) {
      rc?.cache.set(key, cachedFromLru);
      return cachedFromLru;
    }

    const promise = this.getDataLoader.load(key);
    rc?.cache.set(`${this.redisNamespace}:${key}`, promise);
    this.lru.set(key, promise);
    const val = await promise;
    if (val === undefined) {
      this.lru.delete(key);
      rc?.cache.delete(`${this.redisNamespace}:${key}`);
    } else {
      this.lru.set(key, val);
      rc?.cache.set(`${this.redisNamespace}:${key}`, val);
    }

    return val;
  }

  async getOrSet(key: string, fetchValue: () => Promise<T>): Promise<T> {
    const cached = await this.get(key);
    if (cached !== undefined) {
      return cached;
    }

    return this.setPromise(key, fetchValue());
  }

  async set(key: string, val: T): Promise<void> {
    const rc = getRC();
    rc?.cache.set(`${this.redisNamespace}:${key}`, val);
    this.lru.set(key, val);
    await this.setDataLoader.load([key, val]);
    this.lru.set(key, val);
    rc?.cache.set(`${this.redisNamespace}:${key}`, val);
  }

  async setPromise(key: string, promise: Promise<T>): Promise<T> {
    const rc = getRC();
    rc?.cache.set(`${this.redisNamespace}:${key}`, promise);
    this.lru.set(key, promise);

    const val = await promise;
    await this.set(key, val);
    return val;
  }

  async del(key: string): Promise<void> {
    const rc = getRC();
    rc?.cache.delete(`${this.redisNamespace}:${key}`);
    this.lru.delete(key);
    await this.delDataLoader.load(key);
    this.lru.delete(key);
    rc?.cache.delete(`${this.redisNamespace}:${key}`);
  }
}
