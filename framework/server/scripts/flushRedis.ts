import type { Arguments } from 'yargs';

import redisFlushAll from 'utils/infra/redisFlushAll';

export default async function flushRedis(args?: Arguments) {
  const prefix = args?._[2] ?? args?.prefix;
  await redisFlushAll(typeof prefix === 'string' ? prefix.split(',') : undefined);
  printDebug('Flushed Redis', 'success');
}
