import { HealthcheckName, SERVER_STATUS_MAX_STALENESS } from 'services/healthcheck/HealthcheckManager';
import promiseTimeout from 'utils/promiseTimeout';
import { getFailingServices, fixFailingInfra } from 'scripts/fixInfra';
import recreateMVInfra from 'scripts/recreateMVInfra';
import getServersStatus from 'scripts/getServersStatus';
import checkPendingMigrations from 'scripts/mv/steps/checkPendingMigrations';

const STABLE_HEALTHCHECKS: HealthcheckName[] = [
  'rrEntities',
  'mzViews',
  'mzSinkTopics',
];

export default async function initCheckFailingHealthchecks() {
  let failing = new Set<HealthcheckName>();
  let numFails = 0;
  const serversStatus = await getServersStatus({ silent: true });
  const hasActiveServer = TS.objValues(serversStatus)
    .some(server => Date.now() - new Date(server.time).getTime() < SERVER_STATUS_MAX_STALENESS);
  const minFails = hasActiveServer ? 3 : 1;

  while (true) {
    const startTime = performance.now();
    try {
      failing = await promiseTimeout(
        getFailingServices({ forceRerun: true, printFails: true }),
        {
          timeout: 5 * 60 * 1000,
          getErr: () => new Error('initCheckFailingHealthchecks: getFailingServices timed out'),
        },
      );
    } catch (err) {
      numFails++;
      ErrorLogger.error(err, { ctx: 'initCheckFailingHealthchecks: getFailingServices' });
      await pause(30 * 1000);
      continue;
    }

    if (!failing.size
      || (failing.size === 1 && failing.has('mzSinkPrometheus'))) {
      if (numFails) {
        printDebug('-- initCheckFailingHealthchecks: Fixed infra --\n\n', 'success');
      } else {
        printDebug('Healthy init', 'success');
      }
      return;
    }

    numFails++;
    if (numFails < minFails && !STABLE_HEALTHCHECKS.some(name => failing.has(name))) {
      printDebug(
        `Failed ${numFails} ${plural('time', numFails)} during init: ${[...failing].join(', ')}`,
        'success',
      );
      await pause(30 * 1000);
      continue;
    }

    try {
      // todo: med/med don't fix infra when recreating infra
      await checkPendingMigrations();
      if (numFails > minFails) {
        printDebug(`initCheckFailingHealthchecks: Recreating MV infra, failing: ${[...failing].join(', ')}`, 'info');

        try {
          await recreateMVInfra();
          failing = await getFailingServices({ forceRerun: true });
          if (!failing.size) {
            continue;
          }
          printDebug(`initCheckFailingHealthchecks: still failing after recreateMVInfra: ${[...failing].join(', ')}`, 'warn');
        } catch (err) {
          ErrorLogger.error(err, { ctx: 'initCheckFailingHealthchecks: recreateMVInfra' });
          printDebug('initCheckFailingHealthchecks: recreateMVInfra error\n', 'error');
        }
      }

      await withErrCtx(fixFailingInfra(failing), 'initCheckFailingHealthchecks: fixFailingInfra');
    } catch (err) {
      ErrorLogger.error(err, { ctx: 'initCheckFailingHealthchecks: fixFailingInfra' });
      printDebug(`-- initCheckFailingHealthchecks: fixFailingInfra failed after ${Math.round((performance.now() - startTime) / 100) / 10}s --\n`, 'error');
    }
    await pause(30 * 1000);
  }
}
