import type { Arguments } from 'yargs';
import chalk from 'chalk';

import type { RedisServerStatus } from 'services/healthcheck/HealthcheckManager';
import 'services/healthcheck/importHealthchecks';
import { getMinFails, SERVER_STATUS_MAX_STALENESS } from 'services/healthcheck/HealthcheckManager';
import { HEALTHCHECK } from 'consts/coreRedisNamespaces';
import { redisMaster } from 'services/redis';
import { INIT_INFRA_REDIS_KEY } from 'consts/infra';
import { NUM_CLUSTER_SERVERS } from 'serverSettings';

export default async function getServersStatus(args?: Arguments | {
  silent?: boolean,
  silentSuccess?: boolean,
}) {
  const data = await redisMaster.hgetall(`${HEALTHCHECK}:status`);
  const serverKeys = Object.keys(data)
    .map(k => Number.parseInt(k, 10))
    .sort((a, b) => a - b);

  const newData: ObjectOf<RedisServerStatus> = Object.create(null);
  let numActiveServers = 0;

  for (const k of serverKeys) {
    const datum = TS.assertType<RedisServerStatus>(
      JSON.parse(data[k]),
      val => Array.isArray(val.failing)
        && val.failing.every(
          (f: any) => f && typeof f === 'object'
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
      console.log(`Server ${k}:`);
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
        console.log(msg);
      }
    } else if (!args?.silent && !args?.silentSuccess && !hasFails) {
      console.log(`Server ${k}: ${chalk.green('healthy')} (${Math.round(timeAgo / 1000)}s ago)`);
    }

    newData[k] = datum;
  }

  if (!numActiveServers && !args?.silent) {
    console.log(chalk.red('No servers are reporting status'));
    return {};
  }

  if (numActiveServers < NUM_CLUSTER_SERVERS && !args?.silent) {
    console.log(chalk.yellow(`${NUM_CLUSTER_SERVERS - numActiveServers} servers aren't reporting status`));
  }

  if (!args?.silent && await redisMaster.exists(INIT_INFRA_REDIS_KEY)) {
    console.log(chalk.yellow('Currently initializing infra'));
  }

  return newData;
}
