import type { QueueOptions, Job } from 'bull';
import Bull from 'bull';

import BullQueueContextLocalStorage, { createBullQueueContext } from 'services/BullQueueContextLocalStorage';
import { REDIS_HOST, REDIS_PORT } from 'consts/infra';
import { BULL } from 'consts/coreRedisNamespaces';
import { shouldIgnoreRedisError } from 'services/redis';

export function wrapProcessJob<T extends Job<any>>(
  processJob: (job: T) => Promise<void>,
) {
  // If returned fn has second arg, resolving promise won't complete job without calling done()
  return (job: T) => BullQueueContextLocalStorage.run(
    createBullQueueContext(job),
    () => processJob(job),
  );
}

export default function createBullQueue<T>(name: string, opts?: QueueOptions) {
  const queue = new Bull<T>(name, {
    redis: {
      host: REDIS_HOST,
      port: REDIS_PORT,
      password: process.env.REDIS_PASS,
    },
    prefix: BULL,
    ...opts,
  });

  queue.on('failed', (job, err) => {
    ErrorLogger.error(err, { ctx: `Bull(${name}): failed`, name, jobId: job.id });
  });

  queue.on('error', err => {
    if (err.message.includes('Promise timed out')) {
      ErrorLogger.warn(
        new Error(`Bull(${name}): timed out`),
        { name },
      );
    }
    if (!shouldIgnoreRedisError(err)) {
      ErrorLogger.error(err, { ctx: `Bull(${name}): error`, name });
    }
  });

  queue.on('stalled', job => {
    ErrorLogger.warn(getErr(
      `Bull(${name}): stalled`,
      { name, jobId: job.id },
    ));
  });

  return queue;
}
