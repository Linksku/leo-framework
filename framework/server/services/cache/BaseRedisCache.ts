import type DataLoader from 'dataloader';
import QuickLRU from 'quick-lru';

import redis from 'services/redis';
import { DEFAULT_REDIS_CACHE_TTL } from 'consts/infra';
import { API_TIMEOUT } from 'consts/server';
import createDataLoader from 'utils/createDataLoader';
import RedisDataLoader from 'services/redis/RedisDataLoader';
import promiseTimeout from 'utils/promiseTimeout';
import stringify from 'utils/stringify';

export type ConstructorProps<T> = {
  redisNamespace: string,
  serialize: (val: T) => string,
  unserialize: (val: string | undefined, key: string) => T | undefined,
  redisTtl?: number,
  lruTtl?: number,
  lruMaxSize: number,
  disableDataLoader?: boolean,
};

// todo: low/mid remove promises from perf-sensitive functions
// Note: AsyncLocalStorage + async is slow, but removing it requires a callback-based dataloader
export default class BaseRedisCache<T> {
  private redisNamespace: string;

  private serialize: ConstructorProps<T>['serialize'];

  private unserialize: ConstructorProps<T>['unserialize'];

  private getDataLoader: DataLoader<string, T | undefined> | undefined;

  private setDataLoader: RedisDataLoader<'psetex', [string, T], void> | undefined;

  private delDataLoader: RedisDataLoader<'del', string, void> | undefined;

  // For avoiding thundering herd, keep short enough to not need invalidation
  // On update, the server performing the updates invalidates memCache, but other servers don't
  private memCache: QuickLRU<
    string,
    Readonly<T> | undefined | Promise<Readonly<T> | undefined>
  >;

  constructor({
    redisNamespace,
    serialize,
    unserialize,
    redisTtl = DEFAULT_REDIS_CACHE_TTL,
    lruTtl = API_TIMEOUT / 2,
    lruMaxSize,
    disableDataLoader = false,
  }: ConstructorProps<T>) {
    this.redisNamespace = redisNamespace;
    this.serialize = serialize;
    this.unserialize = unserialize;

    this.memCache = new QuickLRU<string, T | Promise<T>>({
      maxSize: lruMaxSize,
      maxAge: lruTtl,
    });

    if (!disableDataLoader) {
      this.getDataLoader = createDataLoader<string, T | undefined>(
        async (keys: readonly string[]) => {
          let results: (string | null)[];
          try {
            results = await redis.mget(keys.map(k => `${redisNamespace}:${k}`));
          } catch (err) {
            return keys.map(key => {
              // Redis reuses Error objects, so need to clone
              const newErr = new Error(err instanceof Error ? err.message : stringify(err));
              if (err instanceof Error) {
                newErr.stack = err.stack;
              }
              return getErr(newErr, { ctx: 'BaseRedisCache.getDataLoader', key });
            });
          }

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
    }
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
    const promise = this.getDataLoader
      ? this.getDataLoader.load(key)
        .catch(err => {
          if (!(err instanceof Error)
            || (!err.message.includes('timed out') && !err.message.includes('max retries'))) {
            throw err;
          }
          return undefined;
        })
      : redis.get(`${this.redisNamespace}:${key}`)
        .then(val => this.unserialize(val ?? undefined, key));
    rc?.reqCache.set(`${this.redisNamespace}:${key}`, promise);
    this.memCache.set(key, promise);

    const val = await promiseTimeout(
      promise,
      {
        timeout: 100,
        defaultVal: undefined,
      },
    );

    this.memCache.delete(key);
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
    if (onlyLocal) {
      return;
    }

    try {
      await promiseTimeout(
        this.setDataLoader
          ? this.setDataLoader.load([key, val])
          : redis.psetex(
            `${this.redisNamespace}:${key}`,
            DEFAULT_REDIS_CACHE_TTL,
            this.serialize(val),
          ),
        {
          timeout: 100,
          defaultVal: undefined,
        },
      );
    } catch (err) {
      if (!(err instanceof Error)
        || (!err.message.includes('timed out') && !err.message.includes('max retries'))) {
        throw err;
      }
    }

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
    this.memCache.delete(key);
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

    try {
      await promiseTimeout(
        this.delDataLoader
          ? this.delDataLoader.load(key)
          : redis.del(`${this.redisNamespace}:${key}`),
        {
          timeout: 100,
          defaultVal: undefined,
        },
      );
    } catch (err) {
      if (!(err instanceof Error)
        || (!err.message.includes('timed out') && !err.message.includes('max retries'))) {
        throw err;
      }
    }

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
