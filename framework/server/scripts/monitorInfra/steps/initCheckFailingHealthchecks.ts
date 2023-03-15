import throttle from 'lodash/throttle';

import type { HealthcheckName } from 'services/healthcheck/HealthcheckManager';
import promiseTimeout from 'utils/promiseTimeout';
import { getFailingServices, fixFailingInfra } from 'scripts/fixInfra';

export default async function initCheckFailingHealthchecks() {
  printDebug('Check healthchecks on init', 'highlight');
  let failing = new Set<HealthcheckName>();
  let hadFails = false;

  const logGetFailingServicesErr = throttle((err: Error | unknown) => {
    ErrorLogger.error(err, { ctx: 'initCheckFailingHealthchecks: getFailingServices' });
  }, 10 * 60 * 1000);

  const logFixFailingInfra = throttle((err: Error | unknown) => {
    ErrorLogger.error(err, { ctx: 'initCheckFailingHealthchecks: fixFailingInfra' });
  }, 10 * 60 * 1000);

  while (true) {
    try {
      failing = await promiseTimeout(
        getFailingServices(),
        5 * 60 * 1000,
        new Error('initCheckFailingHealthchecks: getFailingServices timed out'),
      );
    } catch (err) {
      hadFails = true;
      logGetFailingServicesErr(err);
      await pause(30 * 1000);
      continue;
    }

    if (!failing.size) {
      if (hadFails) {
        printDebug('Fixed healthchecks', 'success');
      }
      return;
    }
    hadFails = true;
    if (failing.size === 1 && failing.has('mzUpdating')) {
      await pause(30 * 1000);
      continue;
    }

    try {
      await fixFailingInfra(failing);
    } catch (err) {
      logFixFailingInfra(err);
    }
    await pause(30 * 1000);
  }
}
