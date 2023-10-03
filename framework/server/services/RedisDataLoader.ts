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
  Key = string,
  Ret = Awaited<ReturnType<RedisCommander[Command]>>,
> extends DataLoader<Key, Ret> {
  constructor(
    command: Command,
    transformKey?: (key: Key) => Parameters<RedisCommander[Command]>,
  ) {
    super(
      async (keys: readonly Key[]) => {
        const pipeline = redis.pipeline();
        for (const k of keys) {
          if (transformKey) {
            // "as any" for perf
            (pipeline as any)[command](...(transformKey as any)(k));
          } else {
            (pipeline as any)[command](k);
          }
        }
        const results = await pipeline.exec();
        return TS.notNull(results).map(([err, res]) => {
          if (err) {
            throw getErr(err, { ctx: 'RedisDataLoader' });
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
