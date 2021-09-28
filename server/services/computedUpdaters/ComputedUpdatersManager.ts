import computedUpdaters from 'config/computedUpdaters';
import createBullQueue from 'lib/createBullQueue';
import type BaseComputedUpdater from './BaseComputedUpdater';
import { BATCHING_DELAY } from './BaseComputedUpdater';

const TRIGGERED_UPDATES: ObjectOf<string[]> = {};
for (const [k, updater] of TS.objectEntries(computedUpdaters)) {
  for (const dep of (updater.constructor as typeof BaseComputedUpdater).dependencies) {
    TS.objValOrSetDefault(TRIGGERED_UPDATES, dep, [])
      .push(k);
  }
}

const queue = createBullQueue<{
  updater: string,
}>('ComputedUpdatersManager');

void queue.process(job => {
  const { updater } = job.data;
  return computedUpdaters[updater]?.updateMulti();
});

// todo: mid/mid trigger updates for newly created entities, e.g. new userClub with existing posts
// todo: high/hard replace computed updaters with redis caches
// todo: high/mid run computed updaters periodically for all ids in case some ids were missed
const ComputedUpdatersManager = {
  triggerUpdates(type: EntityType) {
    if (!TS.hasDefinedProperty(TRIGGERED_UPDATES, type)) {
      return;
    }

    for (const updater of TRIGGERED_UPDATES[type]) {
      void queue.add({
        updater,
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
