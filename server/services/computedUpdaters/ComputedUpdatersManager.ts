import Bull from 'bull';

import computedUpdaters from 'config/computedUpdaters';
import type BaseComputedUpdater from './BaseComputedUpdater';

const TRIGGERED_UPDATES: ObjectOf<string[]> = {};
for (const [k, updater] of objectEntries(computedUpdaters)) {
  for (const dep of (updater.constructor as typeof BaseComputedUpdater).dependencies) {
    objValOrSetDefault(TRIGGERED_UPDATES, dep, [])
      .push(k);
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

void queue.process(async job => {
  const { updater, startTime } = job.data;
  // todo: mid/easy log Bull errors
  return computedUpdaters[updater]?.updateMulti(startTime);
});

const ComputedUpdatersManager = {
  triggerUpdates(type: EntityType) {
    if (!hasDefinedProperty(TRIGGERED_UPDATES, type)) {
      return;
    }

    for (const updater of TRIGGERED_UPDATES[type]) {
      void queue.add({
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
