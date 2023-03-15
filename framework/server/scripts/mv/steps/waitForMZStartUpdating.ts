import checkMZUpdating from '../helpers/checkMZUpdating';

const NUM_TRIES = 3;

export default async function waitForMZStartUpdating() {
  printDebug('Waiting for MZ to start updating', 'highlight');
  const startTime = performance.now();

  for (let i = 0; i < NUM_TRIES; i++) {
    await checkMZUpdating(10 * 60 * 1000);
  }

  printDebug(`MZ started updating after ${Math.round((performance.now() - startTime) / 100) / 10}s`, 'success');
}
