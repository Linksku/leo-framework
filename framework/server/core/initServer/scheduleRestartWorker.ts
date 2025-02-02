import cluster from 'cluster';

import isSecondaryServer from 'utils/isSecondaryServer';
import randInt from 'utils/randInt';

export default function scheduleRestartWorker() {
  if (!isSecondaryServer) {
    return;
  }

  setTimeout(() => {
    printDebug('Worker up for 1 day, restarting.', 'info');
    cluster.worker?.kill();
  }, randInt(23 * 60 * 60 * 1000, 25 * 60 * 60 * 1000));
}
