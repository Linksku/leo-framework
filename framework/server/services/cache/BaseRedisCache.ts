import type DataLoader from 'dataloader';
import QuickLRU from 'quick-lru';

import redis from 'services/redis';
import { MAX_CACHE_TTL } from 'consts/infra';
import { API_POST_TIMEOUT } from 'consts/server';
import createDataLoader from 'core/createDataLoader';
import RedisDataLoader from 'services/RedisDataLoader';

export type ConstructorProps<T> = {
  redisNamespace: string,
  serialize: (val: T) => string,
  unserialize: (val: string | undefined, key: string) => T | undefined,
  redisTtl?: number,
  lruTtl?: number,
  lruMaxSize: number,
};

// todo: low/mid remove promises from perf-sensitive functions
// Note: AsyncLocalStorage + async is slow, but removing it requires a callback-based dataloader
export default class BaseRedisCache<T> {
  private redisNamespace: string;

  private serialize: ConstructorProps<T>['serialize'];

  private unserialize: ConstructorProps<T>['unserialize'];

  private getDataLoader: DataLoader<string, T | undefined>;

  private setDataLoader: RedisDataLoader<'psetex', [string, T], void>;

  private delDataLoader: RedisDataLoader<'del', string, void>;

  private lruTtl: number;

  // Mostly to avoid concurrently fetching same thing, keep short to enough to not need invalidation
  private memCache: QuickLRU<
    string,
    Readonly<T> | undefined | Promise<Readonly<T> | undefined>
  >;

  constructor({
    redisNamespace,
    serialize,
    unserialize,
    redisTtl = MAX_CACHE_TTL,
    lruTtl = API_POST_TIMEOUT,
    lruMaxSize,
  }: ConstructorProps<T>) {
    this.redisNamespace = redisNamespace;
    this.serialize = serialize;
    this.unserialize = unserialize;

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

    this.lruTtl = lruTtl;
    this.memCache = new QuickLRU<string, T | Promise<T>>({
      maxSize: lruMaxSize,
      maxAge: lruTtl,
    });
  }

  async getWithRc(
    rc: Nullish<RequestContext>,
    key: string,
    onlyLocal = false,
  ): Promise<Readonly<T> | undefined> {
    const cachedFromRc = rc?.reqCache.get(`${this.redisNamespace}:${key}`);
    if (cachedFromRc) {
      return cachedFromRc;
    }

    const cachedFromLru = this.memCache.get(key);
    if (cachedFromLru !== undefined) {
      let clone: Readonly<T> | undefined;
      if (cachedFromLru instanceof Promise) {
        const getClone = cachedFromLru.then(
          val => (val !== undefined ? this.unserialize(this.serialize(val), key) : undefined),
        );
        rc?.reqCache.set(`${this.redisNamespace}:${key}`, getClone);
        clone = await getClone;
      } else {
        clone = this.unserialize(this.serialize(cachedFromLru), key);
      }
      rc?.reqCache.set(`${this.redisNamespace}:${key}`, clone);
      return clone;
    }
    if (onlyLocal) {
      return undefined;
    }

    // Don't know why latency is ~10ms sometimes. Removing DataLoader didn't help
    const promise = this.getDataLoader.load(key);
    rc?.reqCache.set(`${this.redisNamespace}:${key}`, promise);
    this.memCache.set(key, promise);
    const val = await promise;
    this.memCache.set(key, val, { maxAge: this.lruTtl / 2 });
    if (val === undefined) {
      rc?.reqCache.delete(`${this.redisNamespace}:${key}`);
    } else {
      rc?.reqCache.set(`${this.redisNamespace}:${key}`, val);
    }

    return val;
  }

  get(
    key: string,
    onlyLocal = false,
  ): Promise<Readonly<T> | undefined> {
    const rc = getRC();
    return this.getWithRc(rc, key, onlyLocal);
  }

  async getOrSetWithRc(
    rc: Nullish<RequestContext>,
    key: string,
    fetchValue: () => Promise<T>,
    onlyLocal = false,
  ): Promise<Readonly<T>> {
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
  ): Promise<Readonly<T>> {
    const rc = getRC();
    return this.getOrSetWithRc(rc, key, fetchValue, onlyLocal);
  }

  async setWithRc(
    rc: Nullish<RequestContext>,
    key: string,
    val: T,
    onlyLocal = false,
  ): Promise<void> {
    rc?.reqCache.set(`${this.redisNamespace}:${key}`, val);
    this.memCache.set(key, val);
    if (onlyLocal) {
      return;
    }

    await this.setDataLoader.load([key, val]);
    rc?.reqCache.set(`${this.redisNamespace}:${key}`, val);
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
  ): Promise<Readonly<T>> {
    rc?.reqCache.set(`${this.redisNamespace}:${key}`, promise);
    this.memCache.set(key, promise);
    const val = await promise;
    await this.setWithRc(rc, key, val, onlyLocal);
    return val;
  }

  setPromise(
    key: string,
    promise: Promise<T>,
    onlyLocal = false,
  ): Promise<Readonly<T>> {
    const rc = getRC();
    return this.setPromiseWithRc(rc, key, promise, onlyLocal);
  }

  async delWithRc(
    rc: Nullish<RequestContext>,
    key: string,
    onlyLocal = false,
  ): Promise<void> {
    rc?.reqCache.delete(`${this.redisNamespace}:${key}`);
    this.memCache.delete(key);
    if (onlyLocal) {
      return;
    }

    await this.delDataLoader.load(key);
    this.memCache.delete(key);
    rc?.reqCache.delete(`${this.redisNamespace}:${key}`);
  }

  del(
    key: string,
    onlyLocal = false,
  ): Promise<void> {
    const rc = getRC();
    return this.delWithRc(rc, key, onlyLocal);
  }
}
