import type { ConstructorProps } from './BaseRedisCache';
import BaseRedisCache from './BaseRedisCache';

export default class IntRedisCache extends BaseRedisCache<number> {
  constructor(props: Omit<ConstructorProps<number>, 'serialize' | 'unserialize'>) {
    super({
      ...props,
      serialize: num => `${num}`,
      unserialize: str => {
        if (!str) {
          return undefined;
        }
        return TS.parseIntOrNull(str) ?? undefined;
      },
    });
  }
}
