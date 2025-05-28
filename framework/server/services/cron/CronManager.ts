import cluster from 'cluster';
import type { RepeatOptions, Job, Queue } from 'bullmq';

import throttledPromiseAll from 'utils/throttledPromiseAll';
import createBullQueue, { createBullWorker } from 'services/bull/createBullQueue';
import promiseTimeout from 'utils/promiseTimeout';

type CronConfig = {
  handler: (job: Job) => void | Promise<void>,
  repeat: RepeatOptions,
  timeout: number,
};

const QUEUE_PREFIX = 'Cron.';

const cronConfigs = new Map<string, CronConfig>();

const queues = new Map<string, Queue>();

const MAX_STALE_TIME = 24 * 60 * 60 * 1000;
let startTime = 0;
let lastRunTime = 0;

setInterval(() => {
  // todo: high/hard figure out why cron often stops in prod
  if (startTime && performance.now() - lastRunTime > 10 * 60 * 1000) {
    printDebug(
      `Cron hasn't ran for 10min, restarting worker. Up for ${Math.round((performance.now() - startTime) / 60_000)}min`,
      'warn',
      { prod: 'always' },
    );
    cluster.worker?.kill();
  }
}, 60 * 1000);

async function startCronJob(name: string) {
  const config = TS.defined(cronConfigs.get(name));

  const queue = createBullQueue(QUEUE_PREFIX + name);
  queues.set(name, queue);

  // todo: low/mid warn when cron job times out
  await queue.add(
    name,
    {},
    {
      repeat: config.repeat,
      // timeout,
      removeOnComplete: true,
      removeOnFail: true,
    },
  );

  createBullWorker(
    QUEUE_PREFIX + name,
    async job => {
      lastRunTime = performance.now();

      try {
        const ret = config.handler(job);
        if (ret instanceof Promise) {
          await ret;
        }
      } catch (err) {
        throw getErr(err, {
          jobName: job.name,
        });
      }
    },
  );
}

export function defineCronJob(
  name: string,
  config: CronConfig,
) {
  if (!process.env.PRODUCTION && name.includes(':')) {
    throw new Error(`defineCronJob: "${name}" shouldn't contain colon`);
  }
  if (cronConfigs.has(name)) {
    throw new Error(`defineCronJob: "${name}" already exists`);
  }

  cronConfigs.set(name, config);
  if (startTime) {
    wrapPromise(startCronJob(name), 'fatal', `startCronJob(${name})`);
  }
}

export async function getExistingJobs(filterUnknown = true) {
  const jobs = await throttledPromiseAll(5, queues.values(), queue => promiseTimeout(
    queue.getRepeatableJobs(),
    {
      timeout: 5 * 1000,
      getErr: () => new Error('CronManager.getExistingJobs: getRepeatableJobs timed out'),
    },
  ));

  const jobsFlat = jobs.flat();
  return filterUnknown
    ? jobsFlat.filter(job => cronConfigs.has(job.name))
    : jobsFlat;
}

export function getCronJobNames() {
  return [...cronConfigs.keys()];
}

// Note: if Bull jobs don't run, flushRedis might help
export async function startCronJobs() {
  if (startTime) {
    throw new Error('CronManager: Cron already started');
  }
  startTime = performance.now();
  lastRunTime = performance.now();

  // const existingJobs = await getExistingJobs(false);
  // const removableJobs = existingJobs
  //   .filter(job => !cronConfigs.has(job.name));
  // await throttledPromiseAll(
  //   10,
  //   removableJobs,
  //   job => queue.removeRepeatableByKey(job.key),
  // );
  let totalRemoved = 0;
  await throttledPromiseAll(5, queues.values(), async queue => {
    const { cleanedPaused, cleanedFailed } = await promiseObj({
      cleanedPaused: queue.clean(MAX_STALE_TIME, 1000, 'paused'),
      cleanedFailed: queue.clean(MAX_STALE_TIME, 1000, 'failed'),
    });
    totalRemoved += cleanedPaused.length + cleanedFailed.length;
  });
  if (totalRemoved) {
    printDebug(`Removed ${totalRemoved} old cron jobs`, 'info');
  }

  await throttledPromiseAll(
    10,
    [...cronConfigs.keys()],
    name => startCronJob(name),
  );
}

// Note: this doesn't seem to always work
export async function restartMissingCronJobs() {
  await throttledPromiseAll(
    10,
    [...queues.entries()],
    async ([name, queue]) => {
      const config = TS.defined(cronConfigs.get(name));
      await queue.add(name, null, {
        repeat: config.repeat,
        removeOnComplete: true,
        removeOnFail: true,
      });
    },
  );
}
