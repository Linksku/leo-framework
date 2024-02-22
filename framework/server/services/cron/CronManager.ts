import type { CronRepeatOptions, EveryRepeatOptions, Job } from 'bull';
import cluster from 'cluster';

import throttledPromiseAll from 'utils/throttledPromiseAll';
import createBullQueue, { wrapProcessJob } from 'core/createBullQueue';

type CronConfig = {
  handler: (job: Job) => void | Promise<void>,
  repeat: CronRepeatOptions | EveryRepeatOptions,
  timeout: number,
};

const cronConfigs = new Map<string, CronConfig>();
const MAX_STALE_TIME = 24 * 60 * 60 * 1000;
let started = false;
let lastRunTime = 0;
export const queue = createBullQueue('CronManager');

setInterval(() => {
  if (started && performance.now() - lastRunTime > 10 * 60 * 1000) {
    printDebug('Cron hasn\'t ran for 10min, restarting worker.', 'warn', { prod: 'always' });
    cluster.worker?.kill();
  }
}, 60 * 1000);

async function startCronJob(name: string, { handler, repeat, timeout }: CronConfig) {
  wrapPromise(
    queue.process(
      name,
      wrapProcessJob(async job => {
        lastRunTime = performance.now();

        try {
          const ret = handler(job);
          if (ret instanceof Promise) {
            await ret;
          }
        } catch (err) {
          throw getErr(err, {
            jobName: name,
          });
        }
      }),
    ),
    'fatal',
    `Define cron job ${name}`,
  );

  await queue.add(name, null, {
    repeat,
    timeout,
    removeOnComplete: true,
    removeOnFail: true,
  });
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

  if (started) {
    wrapPromise(startCronJob(name, config), 'fatal', `startCronJob(${name})`);
  } else {
    cronConfigs.set(name, config);
  }
}

export async function getExistingJobs() {
  const jobs = await queue.getRepeatableJobs();
  return jobs.map(job => job.name).filter(name => cronConfigs.has(name));
}

export function getCronConfigs() {
  return cronConfigs;
}

// Note: if Bull jobs don't run, flushRedis might help
export async function startCronJobs() {
  if (started) {
    throw new Error('CronManager: Cron already started');
  }
  started = true;
  lastRunTime = performance.now();

  const existingJobs = await queue.getRepeatableJobs();
  const removableJobs = existingJobs
    .filter(job => !cronConfigs.has(job.name));
  await throttledPromiseAll(
    10,
    existingJobs
      .filter(job => !cronConfigs.has(job.name)),
    job => queue.removeRepeatableByKey(job.key),
  );
  const { cleanedPaused, cleanedFailed } = await promiseObj({
    cleanedPaused: queue.clean(MAX_STALE_TIME, 'paused'),
    cleanedFailed: queue.clean(MAX_STALE_TIME, 'failed'),
  });
  if (removableJobs.length || cleanedPaused.length || cleanedFailed.length) {
    printDebug(`Removed ${removableJobs.length + cleanedPaused.length + cleanedFailed.length} old cron jobs`, 'info');
  }

  await throttledPromiseAll(
    10,
    [...cronConfigs.entries()],
    ([name, config]) => startCronJob(name, config),
  );
}

// Note: this doesn't seem to always work
export async function restartMissingCronJobs() {
  const existingJobs = await queue.getRepeatableJobs();
  const existingJobNames = new Set(existingJobs.map(job => job.name));
  await throttledPromiseAll(
    10,
    [...cronConfigs]
      .filter(pair => !existingJobNames.has(pair[0])),
    ([name, config]) => queue.add(name, null, {
      repeat: config.repeat,
      timeout: config.timeout,
      removeOnComplete: true,
      removeOnFail: true,
    }),
  );
}
