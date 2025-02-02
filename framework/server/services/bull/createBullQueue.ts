import type { QueueOptions, Job, WorkerOptions } from 'bullmq';
import { Queue, Worker } from 'bullmq';
import omit from 'lodash/omit.js';

import { BULL } from 'consts/coreRedisNamespaces';
import { isRedisUnavailableErr } from 'services/redis';
import { IS_PROFILING_APIS } from 'config';
import { redisConfig } from 'services/redis';
import promiseTimeout from 'utils/promiseTimeout';
import BullQueueContextLocalStorage, { createBullQueueContext } from './BullQueueContextLocalStorage';

export function createBullWorker<
  DataType = any,
  ResultType = any,
  NameType extends string = string,
>(
  queueName: string,
  processJob: (job: Job<DataType, ResultType, NameType>) => Promise<ResultType>,
  opts?: Partial<WorkerOptions>,
) {
  // If returned fn has second arg, resolving promise won't complete job without calling done()
  const worker = new Worker<DataType, ResultType, NameType>(
    queueName,
    (job: Job<DataType, ResultType, NameType>) => BullQueueContextLocalStorage.run(
      createBullQueueContext(job),
      () => processJob(job),
    ),
    {
      connection: {
        ...omit(redisConfig, 'commandTimeout'),
        maxRetriesPerRequest: null,
        enableOfflineQueue: true,
      },
      ...opts,
    },
  );

  worker.on('error', err => {
    if (err.message.includes('Promise timed out')) {
      ErrorLogger.warn(
        new Error(`Bull(${queueName}): timed out`),
        { queueName },
      );
    }
    if (!isRedisUnavailableErr(err) || !process.env.PRODUCTION) {
      ErrorLogger.error(err, { ctx: `Bull(${queueName}): error`, queueName });
    }
  });

  worker.on('failed', (job, err) => {
    if (job) {
      ErrorLogger.error(err, { ctx: `Bull(${queueName}, ${job.name}): failed` });
    } else {
      ErrorLogger.error(err, { ctx: `Bull(${queueName}): failed` });
    }
  });

  const handleBeforeExit = () => promiseTimeout(
    worker.close(),
    {
      timeout: 5000,
      getErr: () => new Error(`Bull(${queueName}): timed out closing`),
    },
  )
    .finally(() => {
      // eslint-disable-next-line unicorn/no-process-exit
      process.exit(1);
    });
  const handleExit = () => {
    handleBeforeExit()
      .catch(err => {
        printDebug(err);
      });
  };
  process.on('beforeExit', handleBeforeExit);
  for (const event of ['exit', 'SIGINT', 'SIGTERM']) {
    process.on(event, handleExit);
  }

  return worker;
}

export default function createBullQueue<
  DataType = any,
  ResultType = any,
  NameType extends string = string,
>(
  name: string,
  opts?: QueueOptions,
): Queue<DataType, ResultType, NameType> {
  const queue = new Queue<DataType, ResultType, NameType>(name, {
    connection: {
      ...omit(redisConfig, 'commandTimeout'),
      maxRetriesPerRequest: null,
      enableOfflineQueue: false,
    },
    prefix: BULL,
    ...opts,
  });

  queue.on('error', err => {
    if (err.message.includes('Promise timed out')) {
      ErrorLogger.warn(
        new Error(`Bull(${name}): timed out`),
        { name },
      );
    }
    if (!isRedisUnavailableErr(err) || !process.env.PRODUCTION) {
      ErrorLogger.error(err, { ctx: `Bull(${name}): error`, name });
    }
  });

  if (!process.env.PRODUCTION) {
    wrapPromise(
      import('services/bull/BullBoard')
        .then(({ addQueue }) => {
          addQueue(queue);
        }),
      'warn',
      `createBullQueue(${name}): addQueue`,
    );
  }

  if (IS_PROFILING_APIS) {
    wrapPromise(queue.pause(), 'warn', `createBullQueue(${name}): pause`);
  } else {
    wrapPromise(
      queue.isPaused()
        .then(isPaused => (isPaused ? queue.resume() : undefined)),
      'warn',
      `createBullQueue(${name}): isPaused`,
    );
  }

  return queue;
}
