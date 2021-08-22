import computedUpdaters from 'config/computedUpdaters';
import createBullQueue from 'lib/createBullQueue';
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

const queue = createBullQueue<{
  updater: string,
  startTime: number,
}>('ComputedUpdatersManager');

void queue.process(async job => {
  const { updater, startTime } = job.data;
  return computedUpdaters[updater]?.updateMulti(startTime);
});

// todo: mid/mid trigger updates for newly create entities, e.g. new userClub with existing posts
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
