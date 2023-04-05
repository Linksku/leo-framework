import { ExecutionError, ResourceLockedError } from 'redlock';

import type { HealthcheckName } from 'services/healthcheck/HealthcheckManager';
import retry from 'utils/retry';
import promiseTimeout from 'utils/promiseTimeout';
import { getFailingServices, fixFailingInfra } from 'scripts/fixInfra';

const GET_FAILING_TIMEOUT = 5 * 60 * 1000;

export default async function monitorHealthchecks() {
  printDebug('Monitoring healthchecks', 'highlight');

  let failing = new Set<HealthcheckName>();
  let startTime = performance.now();
  // eslint-disable-next-line no-constant-condition
  outer: while (1) {
    const iterationStartTime = performance.now();
    await pause(30 * 1000);

    try {
      failing = await promiseTimeout(
        getFailingServices(true),
        GET_FAILING_TIMEOUT,
        new Error('monitorHealthchecks: getFailingServices timed out'),
      );
    } catch (err) {
      ErrorLogger.error(err, { ctx: 'monitorHealthchecks' });
    }

    if (failing.size) {
      // Laptop likely just unpaused
      if (!process.env.PRODUCTION
        && performance.now() - iterationStartTime > GET_FAILING_TIMEOUT * 3) {
        try {
          for (let i = 0; i < 3; i++) {
            await pause(30 * 1000);
            failing = await promiseTimeout(
              getFailingServices(true),
              5 * 60 * 1000,
              new Error('initCheckFailingHealthchecks: getFailingServices timed out'),
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
      printDebug(
        `Infra was healthy for ${Math.round((performance.now() - startTime) / 1000 / 60)}min, auto fixing`,
        'info',
      );

      try {
        await retry(
          async () => {
            await withErrCtx(fixFailingInfra(failing), 'monitorHealthchecks: fixFailingInfra');
            failing = await getFailingServices(true);

            if (failing.size === 1 && failing.has('mzUpdating')) {
              await pause(60 * 1000);
              failing = await getFailingServices();
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
        printDebug('Monitoring after fixing healthchecks', 'highlight');
      } catch (err) {
        const level = err instanceof ExecutionError || err instanceof ResourceLockedError ? 'error' : 'fatal';
        await ErrorLogger[level](err, { ctx: 'monitorHealthchecks' });
      }
    }
  }
}
