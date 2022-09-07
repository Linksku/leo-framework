import type Bull from 'bull';
import createBullQueue, { wrapProcessJob } from 'helpers/createBullQueue';

const cronDefinitions: ObjectOf<{
  handler: () => void | Promise<void>,
  repeat: string,
}> = Object.create(null);

let queue: Bull.Queue<null> | undefined;

function startCronJob(name: string, handler: () => void | Promise<void>, repeat: string) {
  wrapPromise(
    TS.defined(queue).process(
      name,
      wrapProcessJob(async () => {
        const ret = handler();
        if (ret instanceof Promise) {
          await ret;
        }
      }),
    ),
    'fatal',
    `Define cron job ${name}`,
  );

  wrapPromise(
    TS.defined(queue).add(name, null, {
      repeat: {
        cron: repeat,
      },
      timeout: 10 * 60 * 1000,
      removeOnComplete: true,
      removeOnFail: true,
    }),
    'fatal',
    `Add cron job ${name}`,
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
    startCronJob(name, handler, repeat);
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
    startCronJob(name, handler, repeat);
  }
}
