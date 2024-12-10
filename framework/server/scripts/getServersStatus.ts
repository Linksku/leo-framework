import type { Arguments } from 'yargs';
import chalk from 'chalk';

import type { RedisServerStatus } from 'services/healthcheck/HealthcheckManager';
import 'services/healthcheck/importHealthchecks';
import { getMinFails, SERVER_STATUS_MAX_STALENESS } from 'services/healthcheck/HealthcheckManager';
import { HEALTHCHECK } from 'consts/coreRedisNamespaces';
import { redisMaster } from 'services/redis';
import { INIT_INFRA_REDIS_KEY } from 'consts/infra';
import { NUM_CLUSTER_SERVERS } from 'consts/infra';

type Props = {
  silent?: boolean,
  silentSuccess?: boolean,
};

export default async function getServersStatus(args?: Arguments<Props> | Props) {
  const data = await redisMaster.hgetall(`${HEALTHCHECK}:status`);
  const serverKeys = Object.keys(data)
    .map(k => Number.parseInt(k, 10))
    .sort((a, b) => a - b);

  const newData: ObjectOf<RedisServerStatus> = Object.create(null);
  let numActiveServers = 0;

  for (const k of serverKeys) {
    const datum = TS.assertType<RedisServerStatus>(
      JSON.parse(data[k]),
      val => TS.isObj(val)
        && Array.isArray(val.failing)
        && val.failing.every(
          (f: any) => TS.isObj(f)
            && typeof f.name === 'string'
            && typeof f.numFails === 'number'
            && typeof f.isStale === 'boolean'
            && (f.lastErr == null || typeof f.lastErr === 'string'),
        )
        && typeof val.time === 'string',
    );

    const timeAgo = Date.now() - new Date(datum.time).getTime();
    if (timeAgo > SERVER_STATUS_MAX_STALENESS) {
      // Might be worker ID that's no longer active
      continue;
    }

    numActiveServers++;
    const hasFails = datum.failing?.length;
    if (!args?.silent && hasFails) {
      printDebug(`Server ${k}: failing (${Math.round(timeAgo / 1000)}s ago)`);
      for (const service of datum.failing) {
        const isWarning = service.skipped
          || service.isStale
          || service.numFails < getMinFails(service.name);
        let msg = `  ${chalk[isWarning ? 'yellow' : 'red'](service.name)}`;
        if (service.isStale) {
          msg += ' (stale)';
        } else if (service.skipped) {
          msg += ' (skipped)';
        } else if (service.numFails < getMinFails(service.name)) {
          msg += ` (fails: ${service.numFails})`;
        }
        if (!isWarning && service.lastErr) {
          msg += `: ${service.lastErr}`;
        }
        printDebug(msg);
      }
    } else if (!args?.silent && !args?.silentSuccess && !hasFails) {
      printDebug(`Server ${k}: ${chalk.green('healthy')} (${Math.round(timeAgo / 1000)}s ago)`);
    }

    newData[k] = datum;
  }

  if (!numActiveServers && !args?.silent) {
    if (!process.env.SERVER_SCRIPT_PATH?.includes('monitorInfra')) {
      printDebug('No servers are reporting status', 'warn');
    }
    return {};
  }

  if (numActiveServers < NUM_CLUSTER_SERVERS
    && !args?.silent
    && !!process.env.SERVER_SCRIPT_PATH?.includes('monitorInfra')) {
    const numInactive = NUM_CLUSTER_SERVERS - numActiveServers;
    printDebug(
      `${numInactive} ${plural('server', numInactive)} not reporting status`,
      'warn',
    );
  }

  if (!args?.silent && await redisMaster.exists(INIT_INFRA_REDIS_KEY)) {
    printDebug('Currently initializing infra', 'warn');
  }

  return newData;
}
