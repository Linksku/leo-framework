import Bull from 'bull';

import cronjobs from 'config/cronjobs';

const queue = new Bull<{ key: keyof typeof cronjobs }>('CronManager');

if (process.env.NODE_ENV !== 'production') {
  queue.on('failed', (_, err) => {
    console.error(err);
  });
}

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
      });
    }
  },
};
