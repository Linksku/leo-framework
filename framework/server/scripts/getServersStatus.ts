import type { Arguments } from 'yargs';
import chalk from 'chalk';

import type { RedisServerStatus } from 'services/healthcheck/HealthcheckManager';
import 'services/healthcheck/importHealthchecks';
import { getMinFails, SERVER_STATUS_MAX_STALENESS } from 'services/healthcheck/HealthcheckManager';
import { HEALTHCHECK } from 'consts/coreRedisNamespaces';
import { redisMaster } from 'services/redis';
import { INIT_INFRA_REDIS_KEY } from 'consts/infra';

export default async function getServersStatus(args?: Arguments | {
  silent?: boolean,
}) {
  const data = await redisMaster.hgetall(`${HEALTHCHECK}:status`);
  const keys = Object.keys(data)
    .map(k => Number.parseInt(k, 10))
    .sort((a, b) => a - b);

  if (!keys.length) {
    console.log(chalk.red('No servers are reporting status'));
  }

  const newData: ObjectOf<RedisServerStatus> = {};
  for (const k of keys) {
    const datum = TS.assertType<RedisServerStatus>(
      JSON.parse(data[k]),
      val => Array.isArray(val.failing)
        && val.failing.every(
          (f: any) => f && typeof f === 'object'
            && typeof f.name === 'string' && typeof f.numFails === 'number'
            && (f.lastErr == null || typeof f.lastErr === 'string'),
        )
        && typeof val.time === 'string',
    );

    if (!args?.silent) {
      const isOutdated = Date.now() - new Date(datum.time).getTime() > SERVER_STATUS_MAX_STALENESS;
      if (isOutdated || datum.failing?.length) {
        console.log(`Server ${k}: ${isOutdated ? chalk.yellow('outdated') : ''}`);
        for (const service of datum.failing) {
          const color = !isOutdated && service.numFails >= getMinFails(service.name) ? 'red' : 'yellow';
          let msg = `  ${chalk[color](service.name)}`;
          if (service.lastErr) {
            msg += `: ${service.lastErr}`;
          }
          console.log(msg);
        }
      } else {
        console.log(`Server ${k}: ${chalk.green('healthy')}`);
      }
    }

    newData[k] = datum;
  }

  if (await redisMaster.exists(INIT_INFRA_REDIS_KEY)) {
    console.log(chalk.yellow('Currently initializing infra'));
  }

  return newData;
}
