import type { RedisCommander } from 'ioredis';
import DataLoader from 'dataloader';

import redis from 'services/redis';
import stringify from 'utils/stringify';

type AnyCommand = {
  [K in keyof RedisCommander]-?: RedisCommander[K] extends AnyFunction
    ? K
    : never;
}[keyof RedisCommander];

export default class RedisDataLoader<
  Command extends AnyCommand,
  Key = string,
  Ret = Awaited<ReturnType<RedisCommander[Command]>>,
> extends DataLoader<Key, Ret> {
  constructor(
    command: Command,
    transformKey?: (key: Key) => Parameters<RedisCommander[Command]>,
  ) {
    super(
      async (keys: readonly Key[]) => {
        let results: [Error | null, Ret | null][] = [];
        try {
          const pipeline = redis.pipeline();
          for (const k of keys) {
            if (transformKey) {
              // "as any" for perf
              // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
              (pipeline as any)[command](...(transformKey as any)(k));
            } else {
              // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
              (pipeline as any)[command](k);
            }
          }
          results = (await pipeline.exec()) as [Error | null, Ret | null][];
        } catch (err) {
          return keys.map(key => {
            // Redis reuses Error objects, so need to clone
            const newErr = new Error(err instanceof Error ? err.message : stringify(err));
            if (err instanceof Error) {
              newErr.stack = err.stack;
            }
            return getErr(newErr, {
              ctx: `RedisDataLoader(${command})`,
              key: Array.isArray(key) ? key[0] : key,
            });
          });
        }

        return results.map(([err, res], idx) => {
          if (err) {
            const newErr = new Error(err.message);
            newErr.stack = err.stack;
            const key = keys[idx];
            return getErr(newErr, {
              ctx: `RedisDataLoader(${command})`,
              key: Array.isArray(key) ? key[0] : key,
            });
          }
          return res as Ret;
        });
      },
      {
        maxBatchSize: 100,
        cache: false,
      },
    );
  }
}
