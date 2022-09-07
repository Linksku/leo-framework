import type { RedisCommander } from 'ioredis';
import DataLoader from 'dataloader';

import redis from 'services/redis';

type AnyCommand = {
  [K in keyof RedisCommander]-?: RedisCommander[K] extends AnyFunction
    ? K
    : never;
}[keyof RedisCommander];

export default class RedisDataLoader<
  Command extends AnyCommand,
  Key,
  Ret,
  // todo: low/mid check return type against Redis types
> extends DataLoader<Key, Ret> {
  constructor(
    command: AnyCommand,
    transformKey: (key: Key) => Parameters<RedisCommander[Command]>,
  ) {
    super(
      async (keys: readonly Key[]) => {
        const pipeline = redis.pipeline();
        for (const k of keys) {
          (pipeline[command] as AnyFunction)(...transformKey(k));
        }
        const results = await pipeline.exec();
        return TS.notNull(results).map(([err, res]) => {
          if (err) {
            throw err;
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
