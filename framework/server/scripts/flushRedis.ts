import type { Arguments } from 'yargs';

import redisFlushAll from 'utils/infra/redisFlushAll';
import { MODEL_NAMESPACES } from 'consts/coreRedisNamespaces';

export default async function flushRedis(args?: Arguments) {
  const prefix = args?._[2] ?? args?.prefix;
  if (!prefix || typeof prefix !== 'string') {
    throw new Error('Prefix required (maybe "model" or "all")');
  }

  await redisFlushAll(
    prefix === 'all'
      ? undefined
      : (prefix === 'model' ? MODEL_NAMESPACES : prefix.split(',')),
  );
  printDebug('Flushed Redis', 'success');
}
