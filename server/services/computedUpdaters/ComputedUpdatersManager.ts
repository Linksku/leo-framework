import Bull from 'bull';

import type BaseComputedUpdater from './BaseComputedUpdater';

import computedUpdaters from '../../../src/server/config/computedUpdaters';

const TRIGGERED_UPDATES: ObjectOf<string[]> = {};
for (const k of Object.keys(computedUpdaters)) {
  for (const dep of (computedUpdaters[k].constructor as typeof BaseComputedUpdater).dependencies) {
    if (!TRIGGERED_UPDATES[dep]) {
      TRIGGERED_UPDATES[dep] = [];
    }
    TRIGGERED_UPDATES[dep].push(k);
  }
}

const START_TIME_BUFFER = 1000;
const BATCHING_DELAY = 10 * 1000;

const queue = new Bull<{
  updater: string,
  startTime: number,
}>('ComputedUpdatersManager');

if (process.env.NODE_ENV !== 'production') {
  queue.on('failed', (_, err) => {
    console.error(err);
  });
}

// eslint-disable-next-line @typescript-eslint/no-floating-promises
queue.process(async job => {
  const { updater, startTime } = job.data;
  return computedUpdaters[updater].updateMulti(startTime);
});

const ComputedUpdatersManager = {
  triggerUpdates(type: EntityType) {
    if (!TRIGGERED_UPDATES[type]) {
      return;
    }

    for (const updater of TRIGGERED_UPDATES[type]) {
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      queue.add({
        updater,
        startTime: Date.now() - START_TIME_BUFFER,
      }, {
        jobId: updater,
        delay: BATCHING_DELAY,
        removeOnComplete: true,
        removeOnFail: true,
      });
    }
  },
};

export default ComputedUpdatersManager;
