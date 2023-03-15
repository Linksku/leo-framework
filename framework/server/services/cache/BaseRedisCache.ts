import type DataLoader from 'dataloader';
import QuickLRU from 'quick-lru';

import redis from 'services/redis';
import { MAX_CACHE_TTL } from 'serverSettings';
import { API_POST_TIMEOUT } from 'settings';
import createDataLoader from 'utils/createDataLoader';
import RedisDataLoader from 'services/RedisDataLoader';

export type ConstructorProps<T> = {
  redisNamespace: string,
  serialize: (val: T) => string,
  unserialize: (val: string | undefined, key: string) => T | undefined,
  redisTtl?: number,
  lruTtl?: number,
  lruMaxSize: number,
};

// todo: mid/mid remove promises from perf-sensitive functions
// Note: AsyncLocalStorage + async is slow, but removing it requires a callback-based dataloader
export default class BaseRedisCache<T> {
  private redisNamespace: string;

  private getDataLoader: DataLoader<string, T | undefined>;

  private setDataLoader: RedisDataLoader<'psetex', [string, T], void>;

  private delDataLoader: RedisDataLoader<'del', string, void>;

  // todo: mid/mid make lru content readonly
  private lru: QuickLRU<string, T | undefined | Promise<T | undefined>>;

  constructor({
    redisNamespace,
    serialize,
    unserialize,
    redisTtl = MAX_CACHE_TTL,
    // LRU is mostly to avoid concurrently fetching same thing, keep short to enough to not need invalidation
    lruTtl = API_POST_TIMEOUT,
    lruMaxSize,
  }: ConstructorProps<T>) {
    this.redisNamespace = redisNamespace;

    this.getDataLoader = createDataLoader<string, T | undefined>(
      async (keys: readonly string[]) => {
        const results = await redis.mget(keys.map(k => `${redisNamespace}:${k}`));
        return results.map((val, idx) => unserialize(val ?? undefined, keys[idx]));
      },
      {
        maxBatchSize: 1000,
        batchInterval: 0,
      },
    );

    this.setDataLoader = new RedisDataLoader(
      'psetex',
      (kv: [string, T]) => [
        `${redisNamespace}:${kv[0]}`,
        redisTtl,
        serialize(kv[1]),
      ],
    );

    this.delDataLoader = new RedisDataLoader(
      'del',
      (k: string) => [
        [`${redisNamespace}:${k}`],
      ],
    );

    this.lru = new QuickLRU<string, T | Promise<T>>({
      maxSize: lruMaxSize,
      maxAge: lruTtl,
    });
  }

  // todo: mid/mid prevent thundering herd
  async getWithRc(
    rc: Nullish<RequestContext>,
    key: string,
    onlyLocal = false,
  ): Promise<T | undefined> {
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
    if (onlyLocal) {
      return undefined;
    }

    const promise = this.getDataLoader.load(key);
    rc?.cache.set(`${this.redisNamespace}:${key}`, promise);
    this.lru.set(key, promise);
    const val = await promise;
    this.lru.delete(key);
    if (val === undefined) {
      rc?.cache.delete(`${this.redisNamespace}:${key}`);
    } else {
      rc?.cache.set(`${this.redisNamespace}:${key}`, val);
    }

    return val;
  }

  get(
    key: string,
    onlyLocal = false,
  ): Promise<T | undefined> {
    const rc = getRC();
    return this.getWithRc(rc, key, onlyLocal);
  }

  async getOrSetWithRc(
    rc: Nullish<RequestContext>,
    key: string,
    fetchValue: () => Promise<T>,
    onlyLocal = false,
  ): Promise<T> {
    const cached = await this.getWithRc(rc, key, onlyLocal);
    if (cached !== undefined) {
      return cached;
    }

    return this.setPromiseWithRc(rc, key, fetchValue(), onlyLocal);
  }

  getOrSet(
    key: string,
    fetchValue: () => Promise<T>,
    onlyLocal = false,
  ): Promise<T> {
    const rc = getRC();
    return this.getOrSetWithRc(rc, key, fetchValue, onlyLocal);
  }

  async setWithRc(
    rc: Nullish<RequestContext>,
    key: string,
    val: T,
    onlyLocal = false,
  ): Promise<void> {
    rc?.cache.set(`${this.redisNamespace}:${key}`, val);
    this.lru.delete(key);
    if (onlyLocal) {
      return;
    }

    await this.setDataLoader.load([key, val]);
    rc?.cache.set(`${this.redisNamespace}:${key}`, val);
  }

  set(
    key: string,
    val: T,
    onlyLocal = false,
  ): Promise<void> {
    const rc = getRC();
    return this.setWithRc(rc, key, val, onlyLocal);
  }

  async setPromiseWithRc(
    rc: Nullish<RequestContext>,
    key: string,
    promise: Promise<T>,
    onlyLocal = false,
  ): Promise<T> {
    rc?.cache.set(`${this.redisNamespace}:${key}`, promise);
    this.lru.set(key, promise);

    const val = await promise;
    await this.setWithRc(rc, key, val, onlyLocal);
    return val;
  }

  setPromise(
    key: string,
    promise: Promise<T>,
    onlyLocal = false,
  ): Promise<T> {
    const rc = getRC();
    return this.setPromiseWithRc(rc, key, promise, onlyLocal);
  }

  async delWithRc(
    rc: Nullish<RequestContext>,
    key: string,
    onlyLocal = false,
  ): Promise<void> {
    rc?.cache.delete(`${this.redisNamespace}:${key}`);
    this.lru.delete(key);
    if (onlyLocal) {
      return;
    }

    await this.delDataLoader.load(key);
    this.lru.delete(key);
    rc?.cache.delete(`${this.redisNamespace}:${key}`);
  }

  del(
    key: string,
    onlyLocal = false,
  ): Promise<void> {
    const rc = getRC();
    return this.delWithRc(rc, key, onlyLocal);
  }
}
