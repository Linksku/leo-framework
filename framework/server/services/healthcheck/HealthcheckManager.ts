import type { Job } from 'bullmq';

import ServiceContextLocalStorage, { createServiceContext } from 'services/ServiceContextLocalStorage';
import promiseTimeout from 'utils/promiseTimeout';
import rand from 'utils/rand';
import randInt from 'utils/randInt';
import { defineCronJob } from 'services/cron/CronManager';
import PubSubManager from 'services/PubSubManager';
import { IS_PROFILING_APIS } from 'config';
import { NUM_CLUSTER_SERVERS } from 'consts/infra';
import { HEALTHCHECK } from 'consts/coreRedisNamespaces';
import getServerId from 'utils/getServerId';
import { redisMaster, isRedisUnavailableErr } from 'services/redis';
import formatError from 'utils/formatErr';
import { INIT_INFRA_REDIS_KEY } from 'consts/infra';
import stringify from 'utils/stringify';
import { DBZ_FOR_INSERT_ONLY, DBZ_FOR_UPDATEABLE } from 'consts/mz';
import isSecondaryServer from 'utils/isSecondaryServer';

export type HealthcheckName =
  | 'memory'
  | 'disk'
  | 'pgBT'
  | 'pgRR'
  | 'replicationSlots'
  | 'rrEntities'
  | 'dockerCompose'
  | 'dbzConnectors'
  | 'dbzConnectorTopics'
  | 'dbzConnectorTopicMessages'
  | 'mzSources'
  | 'mzDbzSourceRows'
  | 'mzPgSourceRows'
  | 'mzViews'
  | 'mzSinks'
  | 'mzSinkTopics'
  | 'mzSinkTopicMessages'
  | 'mzSinkPrometheus'
  | 'mzSinkConnectors'
  | 'kafkaConnect'
  | 'rrMVs'
  | 'mzUpdating'
  | 'redis'
  | 'bullCron';

export const MZ_DBZ_HEALTHCHECKS: HealthcheckName[] = [
  'replicationSlots',
  'dbzConnectors',
  'dbzConnectorTopics',
  'dbzConnectorTopicMessages',
  ...(DBZ_FOR_INSERT_ONLY || DBZ_FOR_UPDATEABLE ? ['kafkaConnect' as const] : []),
];

export const MZ_HEALTHCHECKS: HealthcheckName[] = [
  'mzSources',
  'mzDbzSourceRows',
  'mzPgSourceRows',
  'mzViews',
  'mzSinks',
  'mzSinkPrometheus',
];

export const MZ_DOWNSTREAM_HEALTHCHECKS: HealthcheckName[] = [
  'mzSinkTopics',
  'mzSinkTopicMessages',
  'mzSinkConnectors',
  'kafkaConnect',
  'rrMVs',
  'mzUpdating',
];

// todo: med/hard monitor error logs

type HealthcheckConfig = {
  disabled?: boolean,
  deps?: HealthcheckName[],
  run: () => Promise<void>,
  onlyForDebug?: boolean,
  onlyForScript?: boolean,
  runOnAllServers?: boolean,
  resourceUsage: 'high' | 'med' | 'low',
  usesResource?: 'bt' | 'rr' | 'docker' | 'kafka' | 'mz',
  stability: 'high' | 'med' | 'low',
  minUpdateFreq?: number,
  timeout: number,
  fix?: () => Promise<void>,
};

export type RedisServerStatus = {
  failing: {
    name: HealthcheckName,
    numFails: number,
    skipped: boolean,
    isStale: boolean,
    lastErr: string | null,
  }[];
  time: string,
};

// Remove this hack once deploy gets better
const hour = (new Date()).getUTCHours();
const START_FAILING = process.env.PRODUCTION
  && process.env.SERVER === 'production'
  // 5 UTC = 9 PST, 10 UTC = 6 EDT
  && hour >= 5
  && hour < 10;

export const SERVER_STATUS_MAX_STALENESS = 60 * 1000;

const healthchecks = Object.create(null) as Record<HealthcheckName, HealthcheckConfig>;
const numFails = Object.create(null) as Record<HealthcheckName, number>;
const skipped = Object.create(null) as Record<HealthcheckName, boolean>;
const lastRunTime = Object.create(null) as Record<HealthcheckName, number>;
const lastErr = Object.create(null) as Record<HealthcheckName, unknown>;
let hasStarted = false;
let hasBeenHealthy = false;

function _getDuration(name: HealthcheckName, passing: boolean) {
  const config = healthchecks[name];
  let intervalIfPassing = {
    high: 60 * 1000,
    med: 30 * 1000,
    low: 10 * 1000,
  }[config.resourceUsage];
  if (config.stability === 'low') {
    intervalIfPassing /= 2;
  }
  const intervalIfFailing = {
    high: 30 * 1000,
    med: 10 * 1000,
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

  return config.timeout + Math.max(interval, 1000);
}

function _isStale(name: HealthcheckName) {
  if (!lastRunTime[name]) {
    return true;
  }
  return performance.now() - lastRunTime[name]
    >= Math.max(5 * 60 * 1000, _getDuration(name, true) * 2);
}

export function getMinFails(name: HealthcheckName) {
  if (!healthchecks[name]) {
    return Number.POSITIVE_INFINITY;
  }
  return Math.max(2, Math.ceil(2 * 60 * 1000 / _getDuration(name, true)));
}

export async function runOneHealthcheck(name: HealthcheckName, timeout?: number | null) {
  const config = healthchecks[name];
  if (!config) {
    throw new Error(`HealthcheckManager.runOneHealthcheck(${name}): doesn't exist`);
  }

  await promiseTimeout(
    config.run(),
    {
      timeout: timeout ? Math.min(timeout, config.timeout) : config.timeout,
      getErr: () => new Error(`runOneHealthcheck: ${name} timed out`),
    },
  );
}

async function _runHealthcheckAllServers(name: HealthcheckName) {
  const config = healthchecks[name];
  const startTime = performance.now();

  const failingDeps = config.deps?.filter(dep => numFails[dep] >= getMinFails(dep));
  if (failingDeps?.length) {
    numFails[name] = getMinFails(name);
    lastErr[name] = getErr(
      `HealthcheckManager._runHealthcheckAllServers(${name}): deps failing`,
      { deps: failingDeps },
    );
    skipped[name] = true;
  } else {
    skipped[name] = false;
    try {
      await runOneHealthcheck(name);

      const prevNumFails = numFails[name];
      numFails[name] = 0;
      lastErr[name] = null;
      if (prevNumFails >= getMinFails(name)) {
        const numUnhealthy = TS.objEntries(numFails).filter(
          pair => pair[1] >= getMinFails(pair[0]),
        ).length;
        if (hasBeenHealthy) {
          printDebug(
            `Healthcheck ${name} healthy (${numUnhealthy} unhealthy)`,
            'success',
            { prod: 'always' },
          );
        }
        if (!numUnhealthy) {
          hasBeenHealthy = true;
        }
      }
    } catch (err) {
      if (!process.env.PRODUCTION && performance.now() - startTime > config.timeout * 2) {
        // Process was likely paused
      } else {
        numFails[name]++;
        lastErr[name] = err;

        if (numFails[name] === getMinFails(name) || !lastRunTime[name]) {
          printDebug(
            `Healthcheck ${name} failed: ${err instanceof Error ? err.message : stringify(err)}`,
            'warn',
            { prod: 'only' },
          );
          if (!await redisMaster.exists(INIT_INFRA_REDIS_KEY)) {
            ErrorLogger.warn(
              new Error(`Healthcheck ${name}: failed`),
              { ...(err instanceof Error && err.debugCtx), err },
            );

            await config.fix?.();
          }
        }
      }
    }
    lastRunTime[name] = performance.now();
  }

  const interval = _getDuration(name, numFails[name] < getMinFails(name)) - config.timeout;
  setTimeout(
    () => wrapPromise(
      _runHealthcheckAllServers(name),
      'error',
      `HealthcheckManager._runHealthcheckAllServers(${name})`,
    ),
    Math.round(rand(interval * 0.9, interval * 1.1)),
  );
}

async function _runHealthcheckOneServer(name: HealthcheckName, _job: Job) {
  const config = healthchecks[name];
  const startTime = performance.now();

  const failingDeps = config.deps?.filter(dep => numFails[dep] >= getMinFails(dep));
  if (failingDeps?.length) {
    numFails[name] = getMinFails(name);
    lastErr[name] = getErr(
      `HealthcheckManager._runHealthcheckOneServer(${name}): deps failing`,
      { deps: failingDeps },
    );
    skipped[name] = true;
  } else {
    skipped[name] = false;
    try {
      await runOneHealthcheck(name);

      const prevNumFails = numFails[name];
      numFails[name] = 0;
      lastErr[name] = null;
      if (prevNumFails >= getMinFails(name)) {
        const numUnhealthy = TS.objEntries(numFails).filter(
          pair => pair[1] >= getMinFails(pair[0]),
        ).length;
        if (hasBeenHealthy) {
          printDebug(
            `Healthcheck ${name} healthy (${numUnhealthy} unhealthy)`,
            'success',
            { prod: 'always' },
          );
        }
        if (!numUnhealthy) {
          hasBeenHealthy = true;
        }

        // await job.update({
        //   repeat: {
        //     every: _getDuration(name, true),
        //   },
        // });
      }

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
            `Healthcheck ${name} failed: ${err instanceof Error ? err.message : stringify(err)}`,
            'warn',
            { prod: 'only' },
          );
          if (!await redisMaster.exists(INIT_INFRA_REDIS_KEY)) {
            ErrorLogger.warn(
              new Error(`Healthcheck ${name}: failed`),
              { ...(err instanceof Error && err.debugCtx), err },
            );

            await config.fix?.();
          }

          if (numFails[name] === getMinFails(name)) {
            // await job.update({
            //   repeat: {
            //     every: _getDuration(name, false),
            //   },
            // });
          }
        }

        PubSubManager.publish(
          `HealthcheckManager.${name}.numFails`,
          `${numFails[name]}`,
        );
      }
    }
  }

  lastRunTime[name] = performance.now();
}

export function addHealthcheck(name: HealthcheckName, config: HealthcheckConfig) {
  if (healthchecks[name]) {
    throw new Error(`HealthcheckManager.addHealthcheck(${name}): already added`);
  }
  if (hasStarted) {
    throw new Error(`HealthcheckManager.addHealthcheck(${name}): already started`);
  }

  healthchecks[name] = config;
  if (!config.disabled && !config.onlyForDebug
    && (!config.onlyForScript || process.env.IS_SERVER_SCRIPT)) {
    numFails[name] = START_FAILING ? getMinFails(name) : 0;
    skipped[name] = false;
    lastRunTime[name] = 0;
    lastErr[name] = START_FAILING
      ? new Error(`HealthcheckManager.addHealthcheck: ${name} hasn't run yet`)
      : null;
  }
}

export function startHealthchecks() {
  hasStarted = true;

  if (IS_PROFILING_APIS) {
    return;
  }

  for (const [name, config] of TS.objEntries(healthchecks)) {
    if (config.disabled || config.onlyForDebug
      || (config.onlyForScript && !process.env.IS_SERVER_SCRIPT)) {
      continue;
    }

    if (config.runOnAllServers) {
      setTimeout(() => {
        ServiceContextLocalStorage.run(
          createServiceContext(`HealthcheckManager:${name}`),
          () => wrapPromise(
            _runHealthcheckAllServers(name),
            'error',
            `HealthcheckManager._runHealthcheckAllServers(${name})`,
          ),
        );
      }, randInt(0, 60 * 1000));
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
        `Healthcheck.${name}`,
        {
          handler: job => {
            ServiceContextLocalStorage.run(
              createServiceContext(`Healthcheck:${name}`),
              () => wrapPromise(
                _runHealthcheckOneServer(name, job),
                'error',
                `HealthcheckManager._runHealthcheckOneServer(${name})`,
              ),
            );
          },
          repeat: {
            every: _getDuration(name, true),
          },
          timeout: config.timeout,
        },
      );
    }
  }

  let lastWarnTime = performance.now();
  setInterval(() => {
    const haventRun = TS.objEntries(lastRunTime)
      .filter(pair => !pair[1]);
    if (haventRun.length) {
      if (performance.now() - lastWarnTime > 10 * 60 * 1000) {
        printDebug(
          `HealthcheckManager: healthchecks haven't run: ${haventRun.map(pair => pair[0]).join(', ')}`,
          'warn',
          { prod: 'always' },
        );
        lastWarnTime = performance.now();
      }
      return;
    }

    const data: RedisServerStatus = {
      failing: TS.objEntries(numFails)
        .map(pair => ({
          name: pair[0],
          numFails: pair[1],
          skipped: skipped[pair[0]],
          isStale: _isStale(pair[0]),
          lastErr: lastErr[pair[0]] ? formatError(lastErr[pair[0]]) : null,
        }))
        .filter(status => status.numFails || status.isStale),
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
  }, SERVER_STATUS_MAX_STALENESS / 4);
}

export function getHealthcheckConfigs() {
  return healthchecks;
}

let isLocked = true;
async function _updateLocked() {
  try {
    isLocked = !!await promiseTimeout(
      redisMaster.exists(INIT_INFRA_REDIS_KEY),
      {
        timeout: 10 * 1000,
        getErr: () => new Error('HealthcheckManager._updateLocked: Redis timed out'),
      },
    );
  } catch (err) {
    if (!isRedisUnavailableErr(err)
      && !(err instanceof Error && err.message.includes('Redis timed out'))) {
      ErrorLogger.error(err, { ctx: 'HealthcheckManager._updateLocked' });
    }
    isLocked = true;
  }

  setTimeout(_updateLocked, 10 * 1000);
}
if (isSecondaryServer) {
  wrapPromise(_updateLocked(), 'fatal', 'HealthcheckManager._updateLocked');
}

export function isHealthy({ onlyFatal, ignoreStaleRR }: {
  onlyFatal?: boolean,
  ignoreStaleRR?: boolean,
} = {}): boolean {
  if (!hasStarted) {
    throw new Error('HealthcheckManager.isHealthy: haven\'t started');
  }
  if (isLocked && !ignoreStaleRR && !onlyFatal) {
    return false;
  }

  const failingHealthchecks = TS.objEntries(numFails)
    .filter(pair => pair[1] >= getMinFails(pair[0])
      || (lastRunTime[pair[0]] && _isStale(pair[0])));
  if (!failingHealthchecks.length) {
    return true;
  }
  const failingRRMVs = failingHealthchecks.some(pair => pair[0] === 'rrMVs');
  if (failingRRMVs || onlyFatal) {
    return !failingRRMVs;
  }

  const notSkippedFailing = failingHealthchecks.filter(pair => !skipped[pair[0]]);
  if (notSkippedFailing.length === 1) {
    const onlyFailingHealthcheck = notSkippedFailing[0];
    // Too unstable
    if (['mzSinkPrometheus', 'mzSinkTopicMessages'].includes(onlyFailingHealthcheck[0])
      && !_isStale(onlyFailingHealthcheck[0])
      && onlyFailingHealthcheck[1] < getMinFails(onlyFailingHealthcheck[0]) * 3) {
      return true;
    }
  }

  if (ignoreStaleRR && failingHealthchecks.every(
    pair => MZ_DBZ_HEALTHCHECKS.includes(pair[0])
      || MZ_HEALTHCHECKS.includes(pair[0])
      || MZ_DOWNSTREAM_HEALTHCHECKS.includes(pair[0]),
  )) {
    return true;
  }

  return false;
}

export function getFailingHealthchecks() {
  if (!hasStarted) {
    throw new Error('HealthcheckManager.getFailingHealthchecks: haven\'t started');
  }
  return TS.objEntries(numFails)
    .filter(pair => pair[1] >= getMinFails(pair[0]) || _isStale(pair[0]))
    .map(pair => pair[0]);
}

const recursiveDeps: Partial<Record<HealthcheckName, Set<HealthcheckName>>> = Object.create(null);
export function healthcheckRecursiveDeps(service: HealthcheckName) {
  if (recursiveDeps[service]) {
    return TS.defined(recursiveDeps[service]);
  }

  const deps = new Set<HealthcheckName>();
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
