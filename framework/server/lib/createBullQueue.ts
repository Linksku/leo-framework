import type { QueueOptions, Job } from 'bull';
import Bull from 'bull';

import BullQueueContextLocalStorage, { createBullQueueContext } from 'services/BullQueueContextLocalStorage';

export function wrapProcessJob<T extends Job<any>>(
  processJob: (job: T) => Promise<void>,
) {
  return (job: T) => BullQueueContextLocalStorage.run(
    createBullQueueContext(job),
    () => processJob(job),
  );
}

export default function createBullQueue<T>(name: string, opts?: QueueOptions) {
  const queue = new Bull<T>(name, opts);

  queue.on('failed', (job, err) => {
    ErrorLogger.warn(err, `${name} Bull queue: ${job.id} job failed.`);
  });

  queue.on('error', err => {
    ErrorLogger.error(err, `${name} Bull queue: queue error.`);
  });

  queue.on('stalled', job => {
    ErrorLogger.warn(new Error(`${name} Bull queue: ${job.id} stalled`));
  });

  return queue;
}
