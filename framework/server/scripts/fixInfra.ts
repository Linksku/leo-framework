import { ExecutionError } from 'redlock';

import type { HealthcheckName } from 'services/healthcheck/HealthcheckManager';
import {
  SERVER_STATUS_MAX_STALENESS,
  MZ_DBZ_HEALTHCHECKS,
  MZ_HEALTHCHECKS,
  MZ_DOWNSTREAM_HEALTHCHECKS,
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
  INIT_INFRA_LOCK_TTL,
} from 'consts/infra';
import redis, { redisMaster } from 'services/redis';
import getDockerComposeStatus from 'utils/infra/getDockerComposeStatus';
import getKafkaTopicsWithoutMessages from 'utils/infra/getKafkaTopicsWithoutMessages';
import isMzRunning from 'utils/infra/isMzRunning';
import {
  BT_CDC_SLOT_PREFIX,
  ENABLE_DBZ,
  MZ_SINK_CONSISTENCY_TOPIC_REGEX,
  MZ_SINK_KAFKA_ERRORS_TABLE,
} from 'consts/mz';
import getPgReplicationStatus from 'utils/infra/getPgReplicationStatus';
import deleteBTReplicationSlot from 'utils/infra/deleteBTReplicationSlot';
import getServersStatus from './getServersStatus';
import runHealthchecksOnce from './runHealthchecksOnce';
import initRR from './mv/initRR';
import initMZ from './mv/initMZ';
import recreateMZSinks from './mv/helpers/recreateMZSinks';
import recreateFailingPrometheusMZSinks from './monitorInfra/helpers/recreateFailingPrometheusMZSinks';
import startDockerCompose from './mv/steps/startDockerCompose';
import deleteMZDocker from './mv/steps/deleteMZDocker';
import recreateMZ from './recreateMZ';

export async function getFailingServices(forceRerun = false, printFails = false) {
  // todo: low/mid handle time outs differently
  if (!forceRerun) {
    try {
      const serversStatus = await getServersStatus(
        printFails
          ? { silentSuccess: true }
          : { silent: true },
      );
      const servers = TS.objValues(serversStatus)
        .filter(
          server => Date.now() - new Date(server.time).getTime() < SERVER_STATUS_MAX_STALENESS,
        );
      if (servers.length >= NUM_CLUSTER_SERVERS / 2) {
        const numServersFailing = Object.create(null) as Record<HealthcheckName, number>;
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

  const results = await runHealthchecksOnce(
    printFails
      ? { silentSuccess: true }
      : { silent: true },
  );
  return new Set(
    TS.objKeys(results)
      .filter(name => !results[name])
      .map(name => name),
  );
}

// todo: mid/mid don't restart server when recreating infra
// todo: low/mid maybe skip init if views etc all exist, but downstream healthchecks fail
async function initAndMaybeRecreateMZ() {
  printDebug('Init MZ', 'info');
  try {
    await initMZ({ sourceTimeout: 60 * 1000 });
    printDebug('Finished init MZ', 'success');
    await pause(60 * 1000);
  } catch (err) {
    printDebug(err, 'error');
  }

  const failing = await getFailingServices(true);
  if (failing.size) {
    printDebug(`Services still failing: ${[...failing].join(', ')}. Recreating MZ`, 'info');
    const forceDeleteAll = failing.has('rrMVs') && failing.has('mzUpdating');
    await recreateMZ({
      forceDeleteDBZConnectors: forceDeleteAll
        || (failing.has('mzSourceRows') && !failing.has('mzSources'))
        || failing.has('dbzConnectors')
        || failing.has('dbzConnectorTopics'),
      deleteMZSources: forceDeleteAll
        || failing.has('mzSources')
        || failing.has('mzSourceRows'),
      deleteMZSinkConnectors: forceDeleteAll
        || failing.has('mzSinks')
        || failing.has('mzSinkPrometheus')
        || failing.has('mzSinkTopics')
        || failing.has('mzSinkTopicMessages')
        || failing.has('mzSinkConnectors')
        || failing.has('mzUpdating'),
      recreateKafka: forceDeleteAll
        || MZ_DBZ_HEALTHCHECKS.some(name => failing.has(name))
        || failing.has('mzSourceRows'),
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
  if (failing.has('pgBT') || failing.has('pgRR')) {
    throw getErr('fixInfra: manual fix required for Postgres', {
      failing: [...failing],
    });
  }

  printDebug(`Attempting to fix failing infra: ${[...failing].join(', ')}`, 'info');

  if (failing.has('replicationSlots')) {
    const replicationStatus = await getPgReplicationStatus();

    if (replicationStatus.missingPubTables.length
      || replicationStatus.extraPubTables.length
      || replicationStatus.missingSlots.length > 1
      || replicationStatus.extraSlots.length
      || replicationStatus.isRRSlotInactive) {
      throw getErr('fixInfra: manual fix required for PG replication slots', {
        failing: [...failing],
      });
    }
    if (replicationStatus.extendedSlots.length) {
      if (replicationStatus.extendedSlots.some(slot => slot.startsWith(BT_CDC_SLOT_PREFIX))) {
        await deleteMZDocker();
      }
      await Promise.all(replicationStatus.extendedSlots.map(
        slot => deleteBTReplicationSlot(slot),
      ));
    }
    if (replicationStatus.missingSlots.length === 1
      && replicationStatus.missingSlots[0] === BT_CDC_SLOT_PREFIX) {
      await startDockerCompose();
      try {
        await initMZ();
        printDebug('Finished init MZ', 'success');
        await pause(60 * 1000);
      } catch (err) {
        printDebug(err, 'error');
      }
      failing = await getFailingServices(true);
    }
  }
  if (failing.has('rrEntities')) {
    // todo: mid/mid check if MZ is updating RR after restarting
    if (onlyFailing('rrEntities')) {
      printDebug('Init RR', 'info');
      await initRR();
      await redisFlushAll(HEALTHCHECK);
      return;
    }
    throw getErr('fixInfra: manual fix required for rrEntities', {
      failing: [...failing],
    });
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
      await redlock.acquire([INIT_INFRA_LOCK_NAME], INIT_INFRA_LOCK_TTL);
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
    mzRunning,
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
    // todo: low/mid maybe check if MZ can recover automatically
    mzRunning: isMzRunning(),
    hasMZKafkaErrorsTable: failing.has('mzSinkPrometheus')
      ? (async () => {
        try {
          const results = await rawSelect(
            `
              SELECT 1
              FROM mz_tables
              WHERE name = ?
              LIMIT 1
            `,
            [MZ_SINK_KAFKA_ERRORS_TABLE],
            {
              db: 'mz',
              timeout: 60 * 1000,
            },
          );
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

  if (!mzRunning) {
    printDebug('MZ isn\'t running, restarting');
    await restartMZ();
    await initAndMaybeRecreateMZ();
  } else if (hasMZKafkaErrorsTable && onlyPossiblyFailing(
    'mzSinks',
    'mzSinkTopics',
    'mzSinkTopicMessages',
    'mzSinkPrometheus',
  )) {
    // Note: different healthchecks can fail for different models
    if (isRecreatingMzSink) {
      printDebug('Recreating MZ sinks', 'info');
      return;
    }

    let sinksWithoutTopicMessages: string[] | null = null;
    if (ENABLE_DBZ && onlyFailing('mzSinkPrometheus')) {
      try {
        sinksWithoutTopicMessages = await getKafkaTopicsWithoutMessages(
          MZ_SINK_CONSISTENCY_TOPIC_REGEX,
          2 * 60 * 1000,
        );
        if (sinksWithoutTopicMessages.length) {
          printDebug(`Sinks without messages: ${sinksWithoutTopicMessages.join(', ')}`, 'warn');
        }
      } catch (err) {
        printDebug(err, 'warn');
      }
    }
    if (onlyFailing('mzSinkPrometheus') && sinksWithoutTopicMessages?.length === 0) {
      printDebug('Recreate failing Prometheus MZ sinks', 'info');
      await recreateFailingPrometheusMZSinks();
    } else {
      printDebug('Recreate all MZ sinks', 'info');
      await recreateMZSinks();
    }
    // Note: sometimes the connectors are failing, so recreating sinks isn't enough
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

    // Note: if DBZ connector fails but there's no Connect error, need to recreate connectors. Can't repro
    await initAndMaybeRecreateMZ();
  } else {
    throw getErr('fixInfra: manual fix required', {
      failingHealthchecks: [...failing],
    });
  }

  await redisFlushAll(HEALTHCHECK);
}

export default async function fixInfra() {
  printDebug('Get failing services', 'info');
  let failing = await getFailingServices(true, true);
  if (!failing.size) {
    printDebug('fixInfra: all healthchecks passed', 'success');
    return;
  }

  printDebug('Attempting auto fix', 'info');
  await withErrCtx(fixFailingInfra(failing), 'fixInfra: fixFailingInfra');

  failing = await getFailingServices(true, true);
  if (failing.size) {
    printDebug(`Auto-fix failed, recreating MZ: ${[...failing].join(', ')}`);
    await recreateMZ({
      forceDeleteDBZConnectors: true,
      deleteMZSources: true,
      deleteMZSinkConnectors: true,
    });
  }

  failing = await getFailingServices(true, true);
  if (failing.size) {
    throw getErr('fixInfra: failed to fix, manual fix required', {
      healthchecks: [...failing],
    });
  }
  printDebug('Fixed infra', 'success');
}
