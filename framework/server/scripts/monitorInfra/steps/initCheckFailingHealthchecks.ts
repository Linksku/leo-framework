import { HealthcheckName, SERVER_STATUS_MAX_STALENESS } from 'services/healthcheck/HealthcheckManager';
import promiseTimeout from 'utils/promiseTimeout';
import { getFailingServices, fixFailingInfra } from 'scripts/fixInfra';
import recreateMZ from 'scripts/recreateMZ';
import getServersStatus from 'scripts/getServersStatus';

const STABLE_HEALTHCHECKS: HealthcheckName[] = [
  'rrEntities',
  'mzViews',
  'mzSinkTopics',
];

export default async function initCheckFailingHealthchecks() {
  printDebug('Check healthchecks on init', 'highlight');
  let failing = new Set<HealthcheckName>();
  let numFails = 0;
  const serversStatus = await getServersStatus({ silent: true });
  const hasActiveServer = TS.objValues(serversStatus)
    .some(server => Date.now() - new Date(server.time).getTime() < SERVER_STATUS_MAX_STALENESS);
  const minFails = hasActiveServer ? 3 : 1;

  while (true) {
    try {
      failing = await promiseTimeout(
        getFailingServices(true, true),
        5 * 60 * 1000,
        new Error('initCheckFailingHealthchecks: getFailingServices timed out'),
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
        printDebug('Fixed healthchecks', 'success');
      } else {
        printDebug('Healthy init', 'success');
      }
      return;
    }

    numFails++;
    if (numFails < minFails && !STABLE_HEALTHCHECKS.some(name => failing.has(name))) {
      printDebug(
        `Failed ${numFails} time${numFails === 1 ? '' : 's'} during init: ${[...failing].join(', ')}`,
        'success',
      );
      await pause(30 * 1000);
      continue;
    }

    try {
      if (numFails === 1) {
        await withErrCtx(fixFailingInfra(failing), 'initCheckFailingHealthchecks: fixFailingInfra');
      } else {
        printDebug('Recreate MZ', 'info');
        await withErrCtx(recreateMZ({
          forceDeleteDBZConnectors: true,
          deleteMZSources: true,
          deleteMZSinkConnectors: true,
        }), 'initCheckFailingHealthchecks: recreateMZ');
      }
    } catch (err) {
      ErrorLogger.error(err, { ctx: 'initCheckFailingHealthchecks: fixFailingInfra' });
    }
    await pause(30 * 1000);
  }
}
