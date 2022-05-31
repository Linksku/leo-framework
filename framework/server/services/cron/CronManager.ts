import type Bull from 'bull';
import createBullQueue, { wrapProcessJob } from 'helpers/createBullQueue';

const cronDefinitions: ObjectOf<{
  handler: () => void | Promise<void>,
  repeat: string,
}> = Object.create(null);

let queue: Bull.Queue<null> | undefined;

async function startCronJob(name: string, handler: () => void | Promise<void>, repeat: string) {
  await TS.defined(queue).process(name, wrapProcessJob(async () => {
    const ret = handler();
    if (ret instanceof Promise) {
      await ret;
    }
  }));

  void wrapPromise(
    TS.defined(queue).add(name, null, {
      repeat: {
        cron: repeat,
      },
      timeout: 10 * 60 * 1000,
      removeOnComplete: true,
      removeOnFail: true,
    }),
    'fatal',
    `Start cron job ${name}`,
  );
}

export function defineCronJob(
  name: string,
  handler: () => void | Promise<void>,
  repeat: string,
) {
  if (Object.hasOwnProperty.call(cronDefinitions, name)) {
    throw new Error(`addCronJob: ${name} already exists`);
  }

  if (queue) {
    void wrapPromise(
      startCronJob(name, handler, repeat),
      'fatal',
      `Define cron job ${name}`,
    );
  } else {
    cronDefinitions[name] = {
      handler,
      repeat,
    };
  }
}

export async function startCronJobs() {
  if (queue) {
    throw new Error('Cron already started');
  }

  queue = createBullQueue('CronManager');

  const existingJobs = await queue.getRepeatableJobs();
  await Promise.all(existingJobs.map(job => queue?.removeRepeatableByKey(job.key)));

  for (const [name, { handler, repeat }] of TS.objEntries(cronDefinitions)) {
    // eslint-disable-next-line no-await-in-loop
    await startCronJob(name, handler, repeat);
  }
}
