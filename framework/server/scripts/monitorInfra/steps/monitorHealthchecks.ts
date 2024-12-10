import { ExecutionError, ResourceLockedError } from 'redlock';

import type { HealthcheckName } from 'services/healthcheck/HealthcheckManager';
import retry from 'utils/retry';
import promiseTimeout from 'utils/promiseTimeout';
import { getFailingServices, fixFailingInfra } from 'scripts/fixInfra';
import recreateMVInfra from 'scripts/recreateMVInfra';
import checkPendingMigrations from 'scripts/mv/steps/checkPendingMigrations';

const GET_FAILING_TIMEOUT = 5 * 60 * 1000;

export default async function monitorHealthchecks() {
  printDebug('Monitoring healthchecks', 'highlight');

  let failing = new Set<HealthcheckName>();
  let startTime = performance.now();
  let iterationsSinceFix = 0;
  outer: while (1) {
    const iterationStartTime = performance.now();
    iterationsSinceFix++;
    await pause(30 * 1000);

    try {
      failing = await promiseTimeout(
        getFailingServices({ printFails: true }),
        {
          timeout: GET_FAILING_TIMEOUT,
          getErr: () => new Error('monitorHealthchecks: getFailingServices timed out'),
        },
      );
    } catch (err) {
      ErrorLogger.error(err, { ctx: 'monitorHealthchecks' });
    }

    if (failing.size
      && !(failing.size === 1 && failing.has('mzSinkPrometheus'))) {
      if (!process.env.PRODUCTION
        && performance.now() - iterationStartTime > GET_FAILING_TIMEOUT * 3) {
        // Laptop likely just unpaused
        try {
          for (let i = 0; i < 3; i++) {
            await pause(30 * 1000);
            failing = await promiseTimeout(
              getFailingServices({ forceRerun: true }),
              {
                timeout: 5 * 60 * 1000,
                getErr: () => new Error('monitorHealthchecks: getFailingServices timed out'),
              },
            );
            if (!failing.size) {
              continue outer;
            }
          }
        } catch (err) {
          ErrorLogger.error(err, { ctx: 'monitorHealthchecks' });
        }
      }

      if (failing.size === 1) {
        ErrorLogger.error(new Error(`monitorHealthchecks: failing healthcheck: ${[...failing][0]}`));
      } else {
        ErrorLogger.error(getErr(
          'monitorHealthchecks: failing healthchecks',
          { healthchecks: [...failing] },
        ));
      }

      if (iterationsSinceFix < 3) {
        printDebug('Recently fixed infra, skipping', 'info');
        continue;
      }
      printDebug(
        `Infra was healthy for ${Math.round((performance.now() - startTime) / 1000 / 60)}min, auto fixing`,
        'info',
      );

      try {
        let isFirstRun = true;
        await retry(
          async () => {
            await checkPendingMigrations();
            if (!isFirstRun) {
              printDebug('monitorHealthchecks: recreating MV infra', 'info');

              try {
                await recreateMVInfra();
                failing = await getFailingServices({ forceRerun: true });
                if (!failing.size) {
                  return;
                }
                printDebug(`monitorHealthchecks: still failing after recreateMVInfra: ${[...failing].join(', ')}`, 'warn');
              } catch (err) {
                printDebug('monitorHealthchecks: recreateMVInfra error', 'error');
                ErrorLogger.error(err, { ctx: 'monitorHealthchecks: recreateMVInfra' });
              }
            }

            try {
              await withErrCtx(fixFailingInfra(failing), 'monitorHealthchecks: fixFailingInfra');
            } catch (err) {
              printDebug('monitorHealthchecks: fixFailingInfra error', 'error');
              throw err;
            }

            isFirstRun = false;
            failing = await getFailingServices({ forceRerun: true });

            if (failing.size === 1 && failing.has('mzUpdating')) {
              await pause(60 * 1000);
              failing = await getFailingServices({ forceRerun: true });
            }

            if (failing.size) {
              throw getErr(
                'Failed to fix failing healthchecks',
                { healthchecks: [...failing] },
              );
            }
          },
          {
            times: 3,
            minTime: 5 * 60 * 1000,
            interval: 10 * 1000,
            printInterval: 0,
            ctx: 'monitorHealthchecks',
          },
        );
        printDebug('Fixed infra', 'success');

        startTime = performance.now();
        iterationsSinceFix = 0;
        printDebug('Monitoring after fixing healthchecks', 'highlight');
      } catch (err) {
        const level = err instanceof ExecutionError || err instanceof ResourceLockedError
          ? 'error'
          : 'fatal';
        await ErrorLogger[level](err, { ctx: 'monitorHealthchecks' });
      }
    }
  }
}
