import type { ConstructorProps } from './BaseRedisCache';
import BaseRedisCache from './BaseRedisCache';

export default class JsonRedisCache<T extends Json> extends BaseRedisCache<T> {
  constructor(props: Omit<ConstructorProps<T>, 'serialize' | 'unserialize'>) {
    super({
      ...props,
      serialize: obj => (
        obj
          ? JSON.stringify(obj)
          : 'null'
      ),
      unserialize: json => {
        if (!json) {
          return undefined;
        }
        if (json === 'null') {
          return null;
        }

        try {
          return JSON.parse(json);
        } catch {}
        return undefined;
      },
    });
  }
}
