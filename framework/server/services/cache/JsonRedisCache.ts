import type { ConstructorProps } from './BaseRedisCache';
import BaseRedisCache from './BaseRedisCache';

export default class JsonRedisCache<T extends Json, T2 extends Json = T> extends BaseRedisCache<T> {
  constructor({
    serialize,
    unserialize,
    ...props
  }: Omit<ConstructorProps<T>, 'serialize' | 'unserialize'> & {
    serialize?: (obj: T) => T2,
    unserialize?: (json: T2, key: string) => T,
  }) {
    super({
      ...props,
      serialize: obj => (
        obj == null
          ? 'null'
          : TS.defined(JSON.stringify(serialize ? serialize(obj) : obj))
      ),
      unserialize: (json, key) => {
        if (!json) {
          return undefined;
        }

        try {
          const parsed = JSON.parse(json) as T2;
          return unserialize ? unserialize(parsed, key) : parsed as unknown as T;
        } catch {
          ErrorLogger.error(new Error(`JsonRedisCache(${key}): data isn't JSON`), { json });
        }
        return undefined;
      },
    });
  }
}
