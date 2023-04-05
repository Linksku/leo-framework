import type { CronRepeatOptions, EveryRepeatOptions, Job } from 'bull';
import pLimit from 'p-limit';

import createBullQueue, { wrapProcessJob } from 'helpers/createBullQueue';

const limiter = pLimit(10);

type CronConfig = {
  handler: (job: Job) => void | Promise<void>,
  repeat: CronRepeatOptions | EveryRepeatOptions,
  timeout: number,
};

const cronConfigs: ObjectOf<CronConfig> = Object.create(null);
let started = false;
const queue = createBullQueue('CronManager');

async function startCronJob(name: string, { handler, repeat, timeout }: CronConfig) {
  wrapPromise(
    queue.process(
      name,
      wrapProcessJob(async job => {
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
  if (Object.prototype.hasOwnProperty.call(cronConfigs, name)) {
    throw new Error(`defineCronJob: "${name}" already exists`);
  }

  if (started) {
    wrapPromise(startCronJob(name, config), 'fatal', `startCronJob(${name})`);
  } else {
    cronConfigs[name] = config;
  }
}

export async function getExistingJobs() {
  const jobs = await queue.getRepeatableJobs();
  return jobs.map(job => job.name).filter(name => cronConfigs[name]);
}

export function getCronConfigs() {
  return cronConfigs;
}

export async function startCronJobs() {
  if (started) {
    throw new Error('CronManager: Cron already started');
  }
  started = true;

  const existingJobs = await queue.getRepeatableJobs();
  await Promise.all(
    existingJobs
      .filter(job => !cronConfigs[job.name])
      .map(job => limiter(
        () => queue.removeRepeatableByKey(job.key),
      )),
  );

  await Promise.all(TS.objEntries(cronConfigs).map(
    ([name, config]) => limiter(() => startCronJob(name, config)),
  ));
}

export async function restartMissingCronJobs() {
  const existingJobs = await queue.getRepeatableJobs();
  const existingJobNames = new Set(existingJobs.map(job => job.name));
  await Promise.all(
    TS.objEntries(cronConfigs)
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
