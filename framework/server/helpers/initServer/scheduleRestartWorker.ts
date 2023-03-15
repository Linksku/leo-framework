import cluster from 'cluster';

import rand from 'utils/rand';

export default function scheduleRestartWorker() {
  if (cluster.isMaster) {
    return;
  }

  setTimeout(() => {
    cluster.worker?.kill();
  }, rand(23 * 60 * 60 * 1000, 25 * 60 * 60 * 1000));
}
