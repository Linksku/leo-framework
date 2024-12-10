import { AsyncLocalStorage } from 'async_hooks';
import type { Job } from 'bullmq';

export type BullQueueContext = {
  queueName: string,
  jobName: string,
  data: any,
};

export function createBullQueueContext<T>(job: Job<T>): BullQueueContext {
  return {
    queueName: job.queueName,
    jobName: job.name,
    data: job.data,
  };
}

export default new AsyncLocalStorage<BullQueueContext>();
