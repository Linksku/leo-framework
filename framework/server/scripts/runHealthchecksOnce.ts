import type { Arguments } from 'yargs';
import groupBy from 'lodash/groupBy.js';

import throttledPromiseAll from 'utils/throttledPromiseAll';
import 'services/healthcheck/importHealthchecks';
import { getHealthcheckConfigs, HealthcheckName } from 'services/healthcheck/HealthcheckManager';
import promiseTimeout from 'utils/promiseTimeout';
import formatErr from 'utils/formatErr';

type Props = {
  silent?: boolean,
  silentSuccess?: boolean,
  timeout?: number,
};

export default async function runHealthchecksOnce(args?: Arguments<Props> | Props) {
  const timeout = TS.parseIntOrNull(args?.timeout);
  const healthchecks = getHealthcheckConfigs();

  const results = Object.create(null) as Record<HealthcheckName, boolean>;
  const printResults: (() => void)[] = Array.from({ length: Object.keys(healthchecks).length });
  let nextPrintIdx = 0;

  const entries = TS.objEntries(healthchecks);
  const entriesByResource = groupBy(
    entries,
    ([, config]) => config.usesResource ?? 'none',
  );
  await Promise.all(Object.values(entriesByResource).map(
    configs => throttledPromiseAll(5, configs, async ([name, config]) => {
      const idx = entries.findIndex(pair => pair[0] === name);
      if (config.disabled
        || (config.onlyForDebug
          && !process.env.SERVER_SCRIPT_PATH?.endsWith('/runHealthchecksOnce'))
        || (config.onlyForScript && !process.env.IS_SERVER_SCRIPT)) {
        printResults[idx] = NOOP;
        return;
      }

      try {
        await promiseTimeout(
          config.cb(),
          timeout ? Math.min(timeout, config.timeout) : config.timeout,
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
    }),
  ));

  if (!args?.silent && !args?.silentSuccess && Object.values(results).every(Boolean)) {
    printDebug('All healthchecks succeeded', 'success');
  }
  return results;
}
