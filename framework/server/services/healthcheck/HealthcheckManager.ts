import type { Job } from 'bull';

import ServiceContextLocalStorage, { createServiceContext } from 'services/ServiceContextLocalStorage';
import promiseTimeout from 'utils/promiseTimeout';
import rand from 'utils/rand';
import { defineCronJob } from 'services/cron/CronManager';
import PubSubManager from 'services/PubSubManager';
import { NUM_CLUSTER_SERVERS } from 'serverSettings';
import { HEALTHCHECK } from 'consts/coreRedisNamespaces';
import getServerId from 'utils/getServerId';
import { redisMaster } from 'services/redis';
import formatError from 'utils/formatErr';
import { INIT_INFRA_REDIS_KEY } from 'consts/infra';

export type HealthcheckName =
  | 'memory'
  | 'disk'
  | 'pgBT'
  | 'pgRR'
  | 'replicationSlots'
  | 'rrEntities'
  | 'dbzConnectors'
  | 'dbzConnectorTopics'
  | 'mzSources'
  | 'mzSourceRows'
  | 'mzViews'
  | 'mzSinks'
  | 'mzSinkTopics'
  | 'mzSinkTopicMessages'
  | 'mzSinkPrometheus'
  | 'mzSinkConnectors'
  | 'rrMVs'
  | 'mzUpdating'
  | 'redis'
  | 'bullCron';

// todo: high/mid monitor error logs

type HealthcheckConfig = {
  deps?: HealthcheckName[],
  cb: () => Promise<void>,
  runOnAllServers?: boolean,
  resourceUsage: 'high' | 'mid' | 'low',
  stability: 'high' | 'mid' | 'low',
  minUpdateFreq?: number,
  timeout: number,
};

export type RedisServerStatus = {
  failing: {
    name: HealthcheckName,
    numFails: number,
    lastErr: string | null,
  }[];
  time: string,
};

const START_FAILING = process.env.PRODUCTION;
export const SERVER_STATUS_MAX_STALENESS = 60 * 1000;

const healthchecks = Object.create(null) as Record<HealthcheckName, HealthcheckConfig>;
const numFails = Object.create(null) as Record<HealthcheckName, number>;
const lastRunTime = Object.create(null) as Record<HealthcheckName, number>;
const lastErr = Object.create(null) as Record<HealthcheckName, unknown>;
let hasStarted = false;

function _getInterval(config: HealthcheckConfig, passing: boolean) {
  let intervalIfPassing = {
    high: 60 * 1000,
    mid: 30 * 1000,
    low: 10 * 1000,
  }[config.resourceUsage];
  if (config.stability === 'low') {
    intervalIfPassing /= 2;
  }
  const intervalIfFailing = {
    high: 30 * 1000,
    mid: 10 * 1000,
    low: 1000,
  }[config.resourceUsage];

  let interval = passing ? intervalIfPassing : intervalIfFailing;
  if (!config.runOnAllServers && NUM_CLUSTER_SERVERS > 1) {
    interval /= 2;
  }
  if (config.minUpdateFreq) {
    interval = passing
      ? Math.max(interval, config.minUpdateFreq / 2)
      : Math.max(interval, config.minUpdateFreq / 4);
  }

  return Math.max(interval, 1000);
}

// todo: low/easy maybe change fail count to fail duration
export function getMinFails(name: HealthcheckName) {
  const config = healthchecks[name];
  const duration = config.timeout + _getInterval(config, true);
  return Math.max(2, Math.ceil(2 * 60 * 1000 / duration));
}

async function _runHealthcheckAllServers(name: HealthcheckName) {
  const config = healthchecks[name];
  const startTime = performance.now();

  if (!config.deps?.some(dep => numFails[dep] >= getMinFails(dep))) {
    try {
      await promiseTimeout(
        config.cb(),
        config.timeout,
        new Error(`Healthcheck: ${name} timed out`),
      );

      if (numFails[name] >= getMinFails(name)) {
        const numUnhealthy = TS.objEntries(numFails).filter(
          pair => pair[0] !== name && pair[1] >= getMinFails(pair[0]),
        ).length;
        printDebug(
          `Healthcheck ${name} healthy (${numUnhealthy} unhealthy)`,
          'success',
          undefined,
          'always',
        );
      }
      numFails[name] = 0;
    } catch (err) {
      if (!process.env.PRODUCTION && performance.now() - startTime > config.timeout * 2) {
        // Process was likely paused
      } else {
        numFails[name]++;
        lastErr[name] = err;

        if (numFails[name] === getMinFails(name) || !lastRunTime[name]) {
          printDebug(
            `Healthcheck ${name} failed`,
            'warn',
            err instanceof Error ? err.message : undefined,
            'only',
          );
          if (!await redisMaster.exists(INIT_INFRA_REDIS_KEY)) {
            ErrorLogger.warn(
              new Error(`Healthcheck ${name}: failed`),
              { ...(err instanceof Error && err.debugCtx), err },
            );
          }
        }
      }
    }
    lastRunTime[name] = performance.now();
  }

  const interval = _getInterval(config, numFails[name] < getMinFails(name));
  setTimeout(
    () => wrapPromise(_runHealthcheckAllServers(name), 'error', `HealthcheckManager._runHealthcheckAllServers(${name})`),
    rand(interval * 0.9, interval * 1.1),
  );
}

async function _runHealthcheckOneServer(name: HealthcheckName, job: Job) {
  const config = healthchecks[name];
  const startTime = performance.now();

  if (!config.deps?.some(dep => numFails[dep] >= getMinFails(dep))) {
    try {
      await promiseTimeout(
        config.cb(),
        config.timeout,
        new Error(`Healthcheck: ${name} timed out`),
      );

      if (numFails[name] >= getMinFails(name)) {
        numFails[name] = 0;
        const numUnhealthy = TS.objEntries(numFails).filter(
          pair => pair[1] >= getMinFails(pair[0]),
        ).length;
        printDebug(
          `Healthcheck ${name} healthy (${numUnhealthy} unhealthy)`,
          'success',
          undefined,
          'always',
        );

        await job.update({
          repeat: {
            every: config.timeout + _getInterval(config, true),
          },
        });
      }

      numFails[name] = 0;
      PubSubManager.publish(
        `HealthcheckManager.${name}.numFails`,
        '0',
      );
    } catch (err) {
      if (!process.env.PRODUCTION && performance.now() - startTime > config.timeout * 2) {
        // Process was likely paused
      } else {
        numFails[name]++;
        lastErr[name] = err;

        if (numFails[name] === getMinFails(name) || !lastRunTime[name]) {
          printDebug(
            `Healthcheck ${name} failed`,
            'warn',
            err instanceof Error ? err.message : undefined,
            'only',
          );
          if (!await redisMaster.exists(INIT_INFRA_REDIS_KEY)) {
            ErrorLogger.warn(
              new Error(`Healthcheck ${name}: failed`),
              { ...(err instanceof Error && err.debugCtx), err },
            );
          }

          if (numFails[name] === getMinFails(name)) {
            await job.update({
              repeat: {
                every: config.timeout + _getInterval(config, false),
              },
            });
          }
        }

        PubSubManager.publish(
          `HealthcheckManager.${name}.numFails`,
          `${numFails[name]}`,
        );
      }
    }
    lastRunTime[name] = performance.now();
  }
}

export function addHealthcheck(name: HealthcheckName, config: HealthcheckConfig) {
  if (healthchecks[name]) {
    throw new Error(`HealthcheckManager.addHealthcheck(${name}): already added`);
  }
  if (hasStarted) {
    throw new Error(`HealthcheckManager.addHealthcheck(${name}): already started`);
  }

  healthchecks[name] = config;
  numFails[name] = START_FAILING ? getMinFails(name) : 0;
  lastRunTime[name] = 0;
  lastErr[name] = START_FAILING ? new Error(`HealthcheckManager.addHealthcheck: ${name} hasn't run yet`) : null;
}

export function startHealthchecks() {
  hasStarted = true;

  for (const [name, config] of TS.objEntries(healthchecks)) {
    if (config.runOnAllServers) {
      setTimeout(() => {
        ServiceContextLocalStorage.run(
          createServiceContext(`HealthcheckManager:${name}`),
          () => wrapPromise(_runHealthcheckAllServers(name), 'error', `HealthcheckManager._runHealthcheckAllServers(${name})`),
        );
      }, rand(0, 60 * 1000));
    } else {
      PubSubManager.subscribe(
        `HealthcheckManager.${name}.numFails`,
        (data: string) => {
          numFails[name] = TS.parseIntOrNull(data, 10) ?? getMinFails(name);
          lastRunTime[name] = performance.now();
          lastErr[name] = null;
        },
      );

      defineCronJob(
        `HealthcheckManager.${name}`,
        {
          handler: job => {
            ServiceContextLocalStorage.run(
              createServiceContext(`HealthcheckManager:${name}`),
              () => wrapPromise(
                _runHealthcheckOneServer(name, job),
                'error',
                `HealthcheckManager._runHealthcheckOneServer(${name})`,
              ),
            );
          },
          repeat: {
            every: config.timeout + _getInterval(config, !START_FAILING),
          },
          timeout: config.timeout,
        },
      );
    }
  }

  setInterval(() => {
    if (!Object.values(lastRunTime).every(Boolean)) {
      return;
    }

    const data: RedisServerStatus = {
      failing: TS.objEntries(numFails)
        .filter(
          pair => pair[1]
            && performance.now() - (lastRunTime[pair[0]] ?? 0) < SERVER_STATUS_MAX_STALENESS,
        )
        .map(pair => ({
          name: pair[0],
          numFails: pair[1],
          lastErr: lastErr[pair[0]] ? formatError(lastErr[pair[0]]) : null,
        })),
      time: new Date().toISOString(),
    };
    wrapPromise(
      redisMaster.hset(
        `${HEALTHCHECK}:status`,
        `${getServerId()}`,
        JSON.stringify(data),
      ),
      'warn',
      'HealthcheckManager: redis.hset',
    );
  }, SERVER_STATUS_MAX_STALENESS / 2);
}

export function getHealthcheckConfigs() {
  return healthchecks;
}

let isLocked = true;
async function _updateLocked() {
  try {
    isLocked = !!await promiseTimeout(
      redisMaster.exists(INIT_INFRA_REDIS_KEY),
      10 * 1000,
      new Error('HealthcheckManager._updateLocked: Redis timed out'),
    );
  } catch (err) {
    ErrorLogger.error(err, { ctx: 'HealthcheckManager._updateLocked' });
    isLocked = true;
  }

  setTimeout(_updateLocked, 10 * 1000);
}
// eslint-disable-next-line unicorn/prefer-top-level-await
wrapPromise(_updateLocked(), 'fatal', 'HealthcheckManager._updateLocked');

export function getIsHealthy(): boolean {
  if (!hasStarted) {
    throw new Error('HealthcheckManager.getIsHealthy: haven\'t started');
  }
  if (isLocked) {
    return false;
  }
  const failingHealthchecks = TS.objEntries(numFails)
    .filter(
      pair => pair[1] >= getMinFails(pair[0])
        // Note: stale is unhealthy, but might be too unstable
        && performance.now() - (lastRunTime[pair[0]] ?? 0) < SERVER_STATUS_MAX_STALENESS,
    );
  const onlyFailingHealthcheck = failingHealthchecks[0];
  if (failingHealthchecks.length === 1
    && ['mzSinkPrometheus', 'mzSinkTopicMessages'].includes(onlyFailingHealthcheck[0])
    && onlyFailingHealthcheck[1] >= getMinFails(onlyFailingHealthcheck[0]) * 3) {
    return true;
  }
  return !failingHealthchecks.length;
}

export function getFailingHealthchecks() {
  if (!hasStarted) {
    throw new Error('HealthcheckManager.getFailingHealthchecks: haven\'t started');
  }
  return TS.objEntries(numFails)
    .filter(
      pair => pair[1] >= getMinFails(pair[0])
        || performance.now() - (lastRunTime[pair[0]] ?? 0) >= SERVER_STATUS_MAX_STALENESS,
    )
    .map(pair => pair[0]);
}

const recursiveDeps: Partial<Record<HealthcheckName, Set<HealthcheckName>>> = Object.create(null);
export function healthcheckRecursiveDeps(service: HealthcheckName) {
  if (recursiveDeps[service]) {
    return TS.defined(recursiveDeps[service]);
  }

  const deps: Set<HealthcheckName> = new Set();
  const configs = [healthchecks[service]];
  while (configs.length) {
    const config = TS.defined(configs.shift());
    if (config.deps) {
      for (const dep of config.deps) {
        deps.add(dep);
        configs.push(healthchecks[dep]);
      }
    }
  }

  recursiveDeps[service] = deps;
  return deps;
}
