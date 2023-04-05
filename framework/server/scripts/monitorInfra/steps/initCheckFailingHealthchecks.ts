import type { HealthcheckName } from 'services/healthcheck/HealthcheckManager';
import promiseTimeout from 'utils/promiseTimeout';
import { getFailingServices, fixFailingInfra } from 'scripts/fixInfra';

export default async function initCheckFailingHealthchecks() {
  printDebug('Check healthchecks on init', 'highlight');
  let failing = new Set<HealthcheckName>();
  let numFails = 0;

  while (true) {
    try {
      failing = await promiseTimeout(
        getFailingServices(true),
        5 * 60 * 1000,
        new Error('initCheckFailingHealthchecks: getFailingServices timed out'),
      );
    } catch (err) {
      numFails++;
      ErrorLogger.error(err, { ctx: 'initCheckFailingHealthchecks: getFailingServices' });
      await pause(30 * 1000);
      continue;
    }

    if (!failing.size) {
      if (numFails) {
        printDebug('Fixed healthchecks', 'success');
      }
      return;
    }

    numFails++;
    if (numFails < 3) {
      printDebug(`Failed ${numFails} time${numFails === 1 ? '' : 's'} during init: ${[...failing].join(', ')}`, 'success');
      await pause(30 * 1000);
      continue;
    }

    try {
      await fixFailingInfra(failing);
    } catch (err) {
      ErrorLogger.error(err, { ctx: 'initCheckFailingHealthchecks: fixFailingInfra' });
    }
    await pause(30 * 1000);
  }
}
