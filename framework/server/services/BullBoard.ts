import type Bull from 'bull';
import { createBullBoard } from '@bull-board/api';
import { BullAdapter } from '@bull-board/api/bullAdapter.js';
import { ExpressAdapter } from '@bull-board/express';

export const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/admin/queues');

const { addQueue: addQueueAdapter } = createBullBoard({
  queues: [],
  serverAdapter,
});

export function addQueue(queue: Bull.Queue) {
  addQueueAdapter(new BullAdapter(queue));
}
