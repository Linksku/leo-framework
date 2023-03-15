import { ExecutionError } from 'redlock';

import type { HealthcheckName } from 'services/healthcheck/HealthcheckManager';
import {
  SERVER_STATUS_MAX_STALENESS,
  getMinFails,
  healthcheckRecursiveDeps,
} from 'services/healthcheck/HealthcheckManager';
import { APP_NAME_LOWER } from 'settings';
import exec from 'utils/exec';
import restartMZ from 'utils/infra/restartMZ';
import redisFlushAll from 'utils/infra/redisFlushAll';
import { HEALTHCHECK } from 'consts/coreRedisNamespaces';
import kafkaAdmin from 'services/kafkaAdmin';
import fetchKafkaConnectors from 'utils/infra/fetchKafkaConnectors';
import { restartMissingCronJobs } from 'services/cron/CronManager';
import { NUM_CLUSTER_SERVERS } from 'serverSettings';
import redlock from 'services/redlock';
import {
  INIT_INFRA_LOCK_NAME,
  RECREATE_MZ_SINKS_REDIS_KEY,
  MZ_HOST,
  MZ_PORT,
} from 'consts/infra';
import redis, { redisMaster } from 'services/redis';
import getDockerComposeStatus from 'utils/infra/getDockerComposeStatus';
import retry from 'utils/retry';
import { MZ_SINK_KAFKA_ERRORS_TABLE } from 'consts/mz';
import getServersStatus from './getServersStatus';
import runHealthchecksOnce from './runHealthchecksOnce';
import initRR from './mv/initRR';
import initMZ from './mv/initMZ';
import recreateMZSinks from './mv/helpers/recreateMZSinks';
import recreateFailingPrometheusMZSinks from './monitorInfra/helpers/recreateFailingPrometheusMZSinks';
import recreateSinkTopicsWithoutMessages from './monitorInfra/helpers/recreateSinkTopicsWithoutMessages';
import startDockerCompose from './mv/steps/startDockerCompose';
import recreateMZ from './recreateMZ';

export const MZ_HEALTHCHECKS = TS.literal([
  'mzSources',
  'mzSourceRows',
  'mzViews',
  'mzSinks',
  'mzSinkPrometheus',
] as const);
export const MZ_DOWNSTREAM_HEALTHCHECKS = TS.literal([
  'mzSinkTopics',
  'mzSinkTopicMessages',
  'mzSinkConnectors',
  'rrMVs',
  'mzUpdating',
] as const);

export async function getFailingServices(forceRerun = false) {
  // todo: low/mid handle time outs differently
  if (!forceRerun) {
    try {
      const serversStatus = await getServersStatus({ silent: true });
      const servers = TS.objValues(serversStatus)
        .filter(
          server => Date.now() - new Date(server.time).getTime() < SERVER_STATUS_MAX_STALENESS,
        );
      if (servers.length >= NUM_CLUSTER_SERVERS / 2) {
        const numServersFailing = {} as Record<HealthcheckName, number>;
        for (const server of servers) {
          for (const service of server.failing) {
            if (service.numFails >= getMinFails(service.name)) {
              if (!numServersFailing[service.name]) {
                numServersFailing[service.name] = 0;
              }
              numServersFailing[service.name]++;
            }
          }
        }

        return new Set(
          TS.objEntries(numServersFailing)
            .filter(pair => pair[1] >= NUM_CLUSTER_SERVERS / 2 && pair[1] >= servers.length / 2)
            .map(pair => pair[0]),
        );
      }
    } catch (err) {
      ErrorLogger.warn(err);
    }
  }

  const results = await runHealthchecksOnce({ silentSuccess: true });
  return new Set(
    TS.objKeys(results)
      .filter(name => !results[name])
      .map(name => name),
  );
}

async function initAndMaybeRecreateMZ() {
  printDebug('Init MZ', 'info');
  try {
    await initMZ();
    await pause(60 * 1000);
  } catch (err) {
    printDebug(err, 'warn');
  }

  const failing = await getFailingServices(true);
  if (failing.size) {
    printDebug('Recreate MZ', 'info');
    await recreateMZ({
      forceDeleteDBZConnectors: (failing.has('mzSourceRows') && !failing.has('mzSources'))
        || failing.has('dbzConnectors')
        || failing.has('dbzConnectorTopics'),
      deleteMZSinkConnectors: failing.has('mzSinks')
        || failing.has('mzSinkTopics')
        || failing.has('mzSinkTopicMessages')
        || failing.has('mzSinkConnectors')
        || failing.has('mzUpdating'),
    });
  }
}

// todo: low/mid move fixes into invidual healthchecks
export async function fixFailingInfra(failing: Set<HealthcheckName>) {
  function onlyPossiblyFailing(...names: HealthcheckName[]) {
    return [...failing].every(
      service => names.includes(service)
        || [...healthcheckRecursiveDeps(service)].some(dep => names.includes(dep)),
    );
  }

  function onlyFailing(...names: HealthcheckName[]) {
    return names.every(name => failing.has(name)) && onlyPossiblyFailing(...names);
  }

  if (!failing.size) {
    return;
  }
  if (failing.has('pgBT') || failing.has('pgRR') || failing.has('replicationSlots')) {
    throw getErr('fixInfra: manual fix required for Postgres', {
      failing: [...failing],
    });
  }

  printDebug(`Attempting to fix failing infra: ${[...failing].join(', ')}`);

  if (failing.has('rrEntities')) {
    // todo: mid/mid check if MZ is updating RR after restarting
    if (onlyFailing('rrEntities')) {
      printDebug('Init RR', 'info');
      await initRR();
      await redisFlushAll(HEALTHCHECK);
      return;
    }
    throw new Error('fixInfra: manual fix required for rrEntities');
  }

  try {
    const dockerComposeStatus = await getDockerComposeStatus();
    if (dockerComposeStatus.missingServices.length
      || dockerComposeStatus.extraServices.length) {
      if (dockerComposeStatus.missingServices.length) {
        console.log(`Docker Compose missing services: ${dockerComposeStatus.missingServices.join(', ')}`);
      } else if (dockerComposeStatus.extraServices.length) {
        console.log(`Docker Compose extra services: ${dockerComposeStatus.extraServices.join(', ')}`);
      }
      await startDockerCompose();
      failing = await getFailingServices(true);
    }
  } catch (err) {
    ErrorLogger.error(err, { ctx: 'getDockerComposeStatus' });
    await startDockerCompose();
    failing = await getFailingServices(true);
  }

  if (failing.has('redis')) {
    try {
      // Fail if connection fails, but not if lock is in use
      await redlock.acquire([INIT_INFRA_LOCK_NAME], 60 * 1000);
    } catch (err) {
      if (err instanceof ExecutionError
        && err.message.includes('The operation was unable to achieve a quorum during its retry window')) {
        throw new Error('fixInfra: failed to acquire Redlock');
      }
    }
    printDebug('Restart Redis', 'info');
    await exec(`yarn dc -p ${APP_NAME_LOWER} --compatibility restart redis`);
    const res = await redis.ping();
    if (res !== 'PONG') {
      throw new Error('fixInfra: restart redis failed');
    }
    failing.delete('redis');

    if (failing.has('bullCron')) {
      printDebug('Restart cron jobs', 'info');
      await restartMissingCronJobs();
      failing.delete('bullCron');
    }
  }

  const {
    kafkaConnectErr,
    mzErr,
    hasMZKafkaErrorsTable,
    isRecreatingMzSink,
  } = await promiseObj({
    kafkaConnectErr: failing.has('dbzConnectors') || failing.has('dbzConnectorTopics')
      ? (async () => {
        try {
          await Promise.all([
            kafkaAdmin.listTopics(),
            fetchKafkaConnectors(''),
          ]);
        } catch (err) {
          ErrorLogger.warn(err, { ctx: 'fixInfra.kafkaConnectErr' });
          return err;
        }
        return null;
      })()
      : null,
    // todo: low/easy maybe check if MZ can recover automatically
    mzErr: (async () => {
      try {
        await retry(
          async () => {
            const res = await fetch(`http://${MZ_HOST}:${MZ_PORT}/status`);
            if (res && res.status >= 400) {
              const text = await res.text();
              throw getErr(`MZ status is ${res.status}`, {
                response: text.slice(0, 100).replaceAll(/\s+/g, ' '),
              });
            }
          },
          {
            times: 3,
            interval: 1000,
            ctx: 'fixInfra.mzErr',
          },
        );
        return null;
      } catch (err) {
        ErrorLogger.warn(err);
        return err;
      }
    })(),
    hasMZKafkaErrorsTable: failing.has('mzSinkPrometheus')
      ? (async () => {
        try {
          const results = await rawSelect('mz', `
            SELECT 1
            FROM mz_tables
            WHERE name = ?
            LIMIT 1
          `, [MZ_SINK_KAFKA_ERRORS_TABLE]);
          return !!results.rows.length;
        } catch {
          return false;
        }
      })()
      : null,
    isRecreatingMzSink: (async () => {
      try {
        return !!(await redisMaster.exists(RECREATE_MZ_SINKS_REDIS_KEY));
      } catch {}
      return false;
    })(),
  });

  if (mzErr) {
    printDebug('MZ isn\'t running, restarting');
    await restartMZ();
    await initAndMaybeRecreateMZ();
  } else if (onlyPossiblyFailing('mzSinks', 'mzSinkTopics', 'mzSinkTopicMessages', 'mzSinkPrometheus') && hasMZKafkaErrorsTable) {
    if (isRecreatingMzSink) {
      printDebug('Recreating MZ sinks', 'info');
      return;
    }
    if (onlyFailing('mzSinkPrometheus')) {
      printDebug('Recreate failing MZ sinks', 'info');
      await recreateFailingPrometheusMZSinks();
    } else if (onlyFailing('mzSinkTopicMessages')) {
      // todo: mid/mid get failing topics from healthcheck
      await recreateSinkTopicsWithoutMessages();
    } else {
      printDebug('Recreate all MZ sinks', 'info');
      await recreateMZSinks();
    }
  } else if (onlyPossiblyFailing(
    'dbzConnectors',
    'dbzConnectorTopics',
    ...MZ_HEALTHCHECKS,
    ...MZ_DOWNSTREAM_HEALTHCHECKS,
  )) {
    if (kafkaConnectErr) {
      throw getErr('fixInfra: manual fix required for Kafka Connect', {
        failingHealthchecks: [...failing],
        err: kafkaConnectErr,
      });
    }

    // todo: high/mid if DBZ connector fails but there's no Connect error, need to recreate connectors
    await initAndMaybeRecreateMZ();
  } else {
    throw getErr('fixInfra: manual fix required', {
      failingHealthchecks: [...failing],
    });
  }

  await redisFlushAll(HEALTHCHECK);
}

export default async function fixInfra() {
  const failing = await getFailingServices();
  if (!failing.size) {
    printDebug('fixInfra: all healthchecks passed', 'success');
    return;
  }

  printDebug('Attempting auto fix', 'info');
  await fixFailingInfra(failing);

  const newFailing = await getFailingServices(true);
  if (newFailing.size) {
    throw getErr('fixInfra: failed to fix, manual fix required', {
      healthchecks: [...newFailing],
    });
  }
  printDebug('Fixed infra', 'success');
}
