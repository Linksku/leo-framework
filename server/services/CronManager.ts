import cronjobs from 'config/cronjobs';
import createBullQueue from 'lib/createBullQueue';

const queue = createBullQueue<{ key: keyof typeof cronjobs }>('CronManager');

void queue.process(async job => {
  const cronjob = cronjobs[job.data.key];
  if (!cronjob) {
    return;
  }

  const ret = cronjob.handler();
  if (ret instanceof Promise) {
    await ret;
  }
});

export default {
  async start() {
    const existingJobs = await queue.getRepeatableJobs();
    await Promise.all(existingJobs.map(async job => queue.removeRepeatableByKey(job.key)));

    for (const [key, cronjob] of objectEntries(cronjobs)) {
      void queue.add({ key }, {
        jobId: key,
        repeat: {
          cron: cronjob.cron,
        },
        timeout: 10 * 60 * 1000,
        removeOnComplete: true,
        removeOnFail: true,
      });
    }
  },
};
