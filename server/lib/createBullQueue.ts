import type { QueueOptions } from 'bull';
import Bull from 'bull';

export default function createBullQueue<T>(name: string, opts?: QueueOptions) {
  const queue = new Bull<T>(name, opts);

  queue.on('failed', (job, err) => {
    ErrorLogger.warning(err, `${name} Bull queue: ${job.id} job failed.`);
  });

  queue.on('error', err => {
    ErrorLogger.error(err, `${name} Bull queue: queue error.`);
  });

  queue.on('stalled', job => {
    ErrorLogger.warning(new Error(`${name} Bull queue: ${job.id} stalled`));
  });

  return queue;
}
