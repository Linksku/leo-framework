import type { CronRepeatOptions, EveryRepeatOptions, Job } from 'bull';
import pLimit from 'p-limit';
import cluster from 'cluster';

import createBullQueue, { wrapProcessJob } from 'helpers/createBullQueue';

const limiter = pLimit(10);

type CronConfig = {
  handler: (job: Job) => void | Promise<void>,
  repeat: CronRepeatOptions | EveryRepeatOptions,
  timeout: number,
};

const cronConfigs = new Map<string, CronConfig>();
let started = false;
let lastRunTime = 0;
const queue = createBullQueue('CronManager');

setInterval(() => {
  if (started && performance.now() - lastRunTime > 10 * 60 * 1000) {
    printDebug('Cron hasn\'t ran for 10min, restarting worker.');
    cluster.worker?.kill();
  }
}, 60 * 1000);

async function startCronJob(name: string, { handler, repeat, timeout }: CronConfig) {
  wrapPromise(
    queue.process(
      name,
      wrapProcessJob(async job => {
        lastRunTime = performance.now();
        const ret = handler(job);
        if (ret instanceof Promise) {
          await ret;
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
  await Promise.all(
    existingJobs
      .filter(job => !cronConfigs.has(job.name))
      .map(job => limiter(
        () => queue.removeRepeatableByKey(job.key),
      )),
  );

  await Promise.all([...cronConfigs].map(
    ([name, config]) => limiter(() => startCronJob(name, config)),
  ));
}

export async function restartMissingCronJobs() {
  const existingJobs = await queue.getRepeatableJobs();
  const existingJobNames = new Set(existingJobs.map(job => job.name));
  await Promise.all(
    [...cronConfigs]
      .filter(pair => !existingJobNames.has(pair[0]))
      .map(([name, config]) => limiter(
        () => queue.add(name, null, {
          repeat: config.repeat,
          timeout: config.timeout,
          removeOnComplete: true,
          removeOnFail: true,
        }),
      )),
  );
}
