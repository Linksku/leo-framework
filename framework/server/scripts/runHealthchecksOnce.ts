import type { Arguments } from 'yargs';
import pLimit from 'p-limit';

import 'services/healthcheck/importHealthchecks';
import { getHealthcheckConfigs, HealthcheckName } from 'services/healthcheck/HealthcheckManager';
import promiseTimeout from 'utils/promiseTimeout';
import formatErr from 'utils/formatErr';

const limiter = pLimit(5);

export default async function runHealthchecksOnce(args?: Arguments | {
  silent?: boolean,
  silentSuccess?: boolean,
}) {
  const healthchecks = getHealthcheckConfigs();

  const results = Object.create(null) as Record<HealthcheckName, boolean>;
  const printResults: (() => void)[] = Array.from({ length: Object.keys(healthchecks).length });
  let nextPrintIdx = 0;
  await Promise.all(TS.objEntries(healthchecks).map(([name, config], idx) => limiter(async () => {
    if (config.disabled
      || (config.onlyForDebug && !process.env.SERVER_SCRIPT_PATH?.endsWith('/runHealthchecksOnce'))) {
      printResults[idx] = NOOP;
      return;
    }

    try {
      await promiseTimeout(
        config.cb(),
        config.timeout,
        new Error(`Healthcheck: ${name} timed out`),
      );

      const failingDeps = config.deps && config.deps.filter(dep => results[dep] === false);
      if (failingDeps?.length) {
        printDebug(`Healthcheck ${name} succeeded, but deps failed: ${failingDeps.join(', ')}`, 'warn');
      }

      results[name] = true;
      printResults[idx] = args?.silentSuccess
        ? NOOP
        : () => printDebug(`${name} succeeded`, 'success');
    } catch (err) {
      results[name] = false;
      printResults[idx] = () => {
        printDebug(`${name} failed`, 'fail');
        console.log(formatErr(err, { maxStackLines: 1 }));
      };
    }

    if (!args?.silent) {
      while (printResults[nextPrintIdx]) {
        printResults[nextPrintIdx]();
        nextPrintIdx++;
      }
    }
  })));

  if (!args?.silent && !args?.silentSuccess && Object.values(results).every(Boolean)) {
    printDebug('All healthchecks succeeded', 'success');
  }
  return results;
}
