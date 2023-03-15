import type { Job } from 'bull';
import { AsyncLocalStorage } from 'async_hooks';

export type BullQueueContext = {
  queueName: string,
  jobName: string,
  data: any,
};

export function createBullQueueContext<T>(job: Job<T>): BullQueueContext {
  return {
    queueName: job.queue.name,
    jobName: job.name,
    data: job.data,
  };
}

export default new AsyncLocalStorage<BullQueueContext>();
