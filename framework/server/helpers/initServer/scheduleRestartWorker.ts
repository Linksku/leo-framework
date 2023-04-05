import cluster from 'cluster';

import randInt from 'utils/randInt';

export default function scheduleRestartWorker() {
  if (cluster.isMaster) {
    return;
  }

  setTimeout(() => {
    cluster.worker?.kill();
  }, randInt(23 * 60 * 60 * 1000, 25 * 60 * 60 * 1000));
}
