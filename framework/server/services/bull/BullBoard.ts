import type { Queue } from 'bullmq';
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter.js';
import { ExpressAdapter } from '@bull-board/express';

export const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/admin/queues');

const { addQueue: addQueueAdapter } = createBullBoard({
  queues: [],
  serverAdapter,
});

export function addQueue(queue: Queue) {
  addQueueAdapter(new BullMQAdapter(queue));
}
