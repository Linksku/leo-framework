import { ExecutionError } from 'redlock';

import type { HealthcheckName } from 'services/healthcheck/HealthcheckManager';
import {
  SERVER_STATUS_MAX_STALENESS,
  MZ_DBZ_HEALTHCHECKS,
  MZ_HEALTHCHECKS,
  MZ_DOWNSTREAM_HEALTHCHECKS,
  getMinFails,
  healthcheckRecursiveDeps,
  runOneHealthcheck,
} from 'services/healthcheck/HealthcheckManager';
import { APP_NAME_LOWER } from 'config';
import exec from 'utils/exec';
import startMZDocker from 'utils/infra/startMZDocker';
import redisFlushAll from 'utils/infra/redisFlushAll';
import { HEALTHCHECK, REDLOCK } from 'consts/coreRedisNamespaces';
import getKafkaAdmin from 'services/getKafkaAdmin';
import fetchKafkaConnectors from 'utils/infra/fetchKafkaConnectors';
import { restartMissingCronJobs } from 'services/cron/CronManager';
import { NUM_CLUSTER_SERVERS } from 'consts/infra';
import redlock from 'services/redis/redlock';
import {
  INIT_INFRA_LOCK_NAME,
  RECREATE_MZ_SINKS_REDIS_KEY,
  INIT_INFRA_LOCK_TTL,
} from 'consts/infra';
import redis, { redisMaster } from 'services/redis';
import getKafkaTopicsWithoutMessages from 'utils/infra/getKafkaTopicsWithoutMessages';
import isMzRunning from 'utils/infra/isMzRunning';
import {
  BT_CDC_SLOT_PREFIX,
  BT_SLOT_RR,
  MZ_SINK_TOPIC_REGEX,
  MZ_ENABLE_CONSISTENCY_TOPIC,
  MZ_SINK_CONSISTENCY_TOPIC_REGEX,
  MZ_SINK_KAFKA_ERRORS_TABLE,
} from 'consts/mz';
import getPgReplicationStatus from 'utils/infra/getPgReplicationStatus';
import deleteBTReplicationSlot from 'utils/infra/deleteBTReplicationSlot';
import listKafkaTopics from 'utils/infra/listKafkaTopics';
import MaterializedViewModels from 'core/models/allMaterializedViewModels';
import startDockerCompose from 'scripts/startDockerCompose';
import { createEachModel } from 'config/functions';
import { HAS_MVS } from 'config/__generated__/consts';
import getServersStatus from './getServersStatus';
import runHealthchecksOnce from './runHealthchecksOnce';
import initRR from './mv/initRR';
import initMZ from './mv/initMZ';
import recreateMVInfra from './recreateMVInfra';
import recreateMZSinks from './mv/helpers/recreateMZSinks';
import recreateFailingPrometheusMZSinks from './monitorInfra/helpers/recreateFailingPrometheusMZSinks';
import deleteMZDocker from './mv/steps/deleteMZDocker';
import createBTPublications from './mv/steps/createBTPublications';
import recreateMZ from './recreateMZ';
import createDBZReplicationSlots from './mv/steps/createDBZReplicationSlots';
import createRRSubscription from './mv/steps/createRRSubscription';
import checkPendingMigrations from './mv/steps/checkPendingMigrations';

const RAN_FIX_INFRA_DIRECTLY = !!(process.env.IS_SERVER_SCRIPT
  && process.env.SERVER_SCRIPT_PATH?.includes('fixInfra'));

export async function getFailingServices({
  forceRerun = false,
  printFails = false,
  healthcheckTimeout,
}: {
  forceRerun?: boolean,
  printFails?: boolean,
  healthcheckTimeout?: number,
}) {
  // todo: low/med handle time outs differently
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

  const results = await runHealthchecksOnce({
    fix: true,
    silentSuccess: printFails,
    silent: !printFails,
    timeout: healthcheckTimeout,
  });
  return new Set(
    TS.objKeys(results)
      .filter(name => !results[name])
      .map(name => name),
  );
}

// todo: low/med maybe skip init if views etc all exist, but downstream healthchecks fail
async function initOrRecreateMZ(failing: Set<HealthcheckName>, initFromScratch = false) {
  printDebug('fixInfra: Init MZ', 'info');

  if (!initFromScratch) {
    try {
      printDebug('fixInfra: initOrRecreateMZ: init MZ with short timeout', 'success');
      await initMZ({ sourceTimeout: 60 * 1000 });
      printDebug('Finished init MZ', 'success');
      await pause(10 * 1000);

      failing = await getFailingServices({ forceRerun: true, healthcheckTimeout: 60 * 1000 });
      if (!failing.size) {
        return;
      }
    } catch (err) {
      printDebug(err, 'error');
    }
  }

  printDebug(
    `fixInfra: initOrRecreateMZ: services ${initFromScratch ? '' : 'still '}failing: ${[...failing].join(', ')}`,
    'info',
  );
  const forceDeleteAll = failing.has('rrMVs') && failing.has('mzUpdating');
  await recreateMZ({
    deleteRRMVData: forceDeleteAll
      || failing.has('rrMVs'),
    deleteMZSinkConnectors: forceDeleteAll
      || failing.has('mzSinks')
      || failing.has('mzSinkPrometheus')
      || failing.has('mzSinkTopics')
      || failing.has('mzSinkTopicMessages')
      || failing.has('mzSinkConnectors')
      || failing.has('kafkaConnect')
      || failing.has('mzUpdating'),
    deleteMZSources: forceDeleteAll
      || failing.has('mzSources')
      || failing.has('mzDbzSourceRows')
      || failing.has('mzPgSourceRows'),
    forceDeleteDBZConnectors: forceDeleteAll
      || (failing.has('mzDbzSourceRows') && !failing.has('mzSources'))
      || failing.has('dbzConnectors')
      || failing.has('dbzConnectorTopics')
      || failing.has('dbzConnectorTopicMessages'),
    deleteMZReplicationSlots: failing.has('replicationSlots')
      || failing.has('mzPgSourceRows'),
    recreateKafka: forceDeleteAll
      || MZ_DBZ_HEALTHCHECKS.some(name => failing.has(name))
      || failing.has('mzDbzSourceRows'),
  });
}

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

  printDebug(`\n\n-- fixFailingInfra: failing services: ${[...failing].join(', ')} --`, 'info');
  if (failing.has('pgBT') || failing.has('pgRR')) {
    throw getErr('fixInfra: manual fix required for Postgres', {
      failing: [...failing],
    });
  }

  try {
    await checkPendingMigrations();
  } catch (err) {
    if (err instanceof Error && err.message.includes('empty entity table')) {
      await createEachModel();
    }
  }

  let initMZFromScratch = false;
  if (failing.has('replicationSlots')) {
    const allMzHealthchecks = [
      ...MZ_DBZ_HEALTHCHECKS,
      ...MZ_HEALTHCHECKS,
      ...MZ_DOWNSTREAM_HEALTHCHECKS,
    ];
    if (allMzHealthchecks.filter(name => failing.has(name)).length
      > allMzHealthchecks.length / 2) {
      printDebug('fixInfra: possibly clean init, recreating MV infra', 'info');
      await recreateMVInfra();
      await redisFlushAll(HEALTHCHECK);
      return;
    }

    const replicationStatus = await getPgReplicationStatus();
    if ((replicationStatus.missingPubTables.length && !replicationStatus.missingSlots.length)
      || replicationStatus.extraPubTables.length
      || replicationStatus.extraSlots.length
      || replicationStatus.isRRSlotInactive) {
      throw getErr('fixInfra: manual fix required for PG replication slots', {
        failing: [...failing],
        replicationStatus,
      });
    }

    if (replicationStatus.extendedSlots.length) {
      printDebug('fixInfra: deleting extended slots', 'info');
      if (replicationStatus.extendedSlots.some(slot => slot.startsWith(BT_CDC_SLOT_PREFIX))) {
        await deleteMZDocker();
        failing.add('dockerCompose');
      }
      await Promise.all(replicationStatus.extendedSlots.map(
        slot => deleteBTReplicationSlot(slot),
      ));
    }

    if (replicationStatus.missingPubTables.length
      || replicationStatus.missingSlots.filter(slot => slot !== BT_CDC_SLOT_PREFIX).length) {
      printDebug('fixInfra: creating publications', 'info');
      await Promise.all([
        createBTPublications(),
        createDBZReplicationSlots(),
      ]);

      if (replicationStatus.missingSlots.includes(BT_SLOT_RR)) {
        await createRRSubscription();
      }
      initMZFromScratch = true;
    }

    if (replicationStatus.missingSlots.includes(BT_CDC_SLOT_PREFIX)) {
      printDebug('fixInfra: creating CDC slots', 'info');
      await startDockerCompose({ allowRecreate: RAN_FIX_INFRA_DIRECTLY });

      if (onlyFailing('replicationSlots')) {
        try {
          printDebug('Missing MZ slot, start init MZ', 'success');
          await initMZ();
          printDebug('Finished init MZ', 'success');
          await pause(60 * 1000);
        } catch (err) {
          printDebug(err, 'error');
        }
      }
      initMZFromScratch = true;
    }

    failing = await getFailingServices({ forceRerun: true, healthcheckTimeout: 60 * 1000 });
    if (failing.has('replicationSlots')) {
      printDebug(`fixInfra: failed to fix PG replication slots: ${[...failing].join(', ')}`, 'warn');
      printDebug('fixInfra: recreating MV infra', 'info');
      await recreateMVInfra();
      await redisFlushAll(HEALTHCHECK);
      return;
    }
  }

  if (!MZ_ENABLE_CONSISTENCY_TOPIC
    && failing.has('mzSinkTopics') && !failing.has('mzSinks')) {
    const topics = await listKafkaTopics(MZ_SINK_TOPIC_REGEX);
    const modelsWithSinks = MaterializedViewModels
      .filter(m => m.getReplicaTable());
    if (topics.length > modelsWithSinks.length * 2) {
      // MZ is restarting and creating new topics every time
      await deleteMZDocker();
      failing.add('dockerCompose');
    }
  }

  if (failing.has('rrEntities')) {
    if (onlyFailing('rrEntities')) {
      printDebug('Init RR', 'info');
      await initRR();
    } else {
      await initOrRecreateMZ(failing, initMZFromScratch);
    }

    await runOneHealthcheck('rrEntities');
    await redisFlushAll(HEALTHCHECK);
    return;
  }

  if (failing.has('dockerCompose')) {
    await startDockerCompose({ allowRecreate: RAN_FIX_INFRA_DIRECTLY });
    failing.delete('dockerCompose');
    initMZFromScratch = true;
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
  }

  if (failing.has('bullCron')) {
    printDebug('Restart cron jobs', 'info');
    await restartMissingCronJobs();
    failing.delete('bullCron');
  }

  const {
    kafkaConnectErr,
    mzRunning,
    hasMZKafkaErrorsTable,
    isRecreatingMzSink,
  } = await promiseObj({
    kafkaConnectErr: failing.has('dbzConnectors')
      || failing.has('dbzConnectorTopics')
      || failing.has('dbzConnectorTopicMessages')
      ? (async () => {
        try {
          await Promise.all([
            getKafkaAdmin().listTopics(),
            fetchKafkaConnectors(''),
          ]);
        } catch (err) {
          ErrorLogger.warn(err, { ctx: 'fixInfra.kafkaConnectErr' });
          return err;
        }
        return null;
      })()
      : null,
    // todo: low/med maybe check if MZ can recover automatically
    mzRunning: HAS_MVS ? false : isMzRunning(),
    hasMZKafkaErrorsTable: failing.has('mzSinkPrometheus')
      ? (async () => {
        try {
          const results = await rawSelect(
            'mz',
            `
              SELECT 1
              FROM mz_tables
              WHERE name = ?
              LIMIT 1
            `,
            [MZ_SINK_KAFKA_ERRORS_TABLE],
            {
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

  if (!mzRunning && HAS_MVS) {
    printDebug('fixInfra: MZ isn\'t running, restarting');
    await startMZDocker(true);
    await initOrRecreateMZ(failing, true);
  } else if (!failing.size) {
    // pass
  } else if (hasMZKafkaErrorsTable && onlyPossiblyFailing(
    'mzSinks',
    'mzSinkTopics',
    'mzSinkTopicMessages',
    'mzSinkPrometheus',
    'kafkaConnect',
  )) {
    // Note: different healthchecks can fail for different models
    if (isRecreatingMzSink) {
      printDebug('Recreating MZ sinks', 'info');
      return;
    }

    let sinksWithoutTopicMessages: string[] | null = null;
    if (MZ_ENABLE_CONSISTENCY_TOPIC && onlyFailing('mzSinkPrometheus')) {
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
    'dbzConnectorTopicMessages',
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
    await initOrRecreateMZ(failing, initMZFromScratch);
  } else {
    throw getErr('fixInfra: manual fix required', {
      failingHealthchecks: [...failing],
    });
  }

  await redisFlushAll(HEALTHCHECK);
}

export default async function fixInfra() {
  if (RAN_FIX_INFRA_DIRECTLY && process.env.IS_DOCKER) {
    printDebug('fixInfra: run fixInfra with `--no-docker` to avoid killing itself', 'info');
    return;
  }

  printDebug('Get failing services', 'info');
  let failing = await getFailingServices({ forceRerun: true, printFails: true });
  if (!failing.size) {
    printDebug('fixInfra: all healthchecks passed', 'success');
    return;
  }

  printDebug('fixInfra: Attempting auto fix', 'info');
  if (process.env.SERVER === 'production') {
    await checkPendingMigrations();

    if (process.env.IS_SERVER_SCRIPT && !process.env.SERVER_SCRIPT_PATH?.includes('monitorInfra')) {
      await exec(`yarn dc -p ${APP_NAME_LOWER} stop server monitor-infra`);
      await redisFlushAll(REDLOCK);
    }
  }
  await withErrCtx(fixFailingInfra(failing), 'fixInfra: fixFailingInfra');

  failing = await getFailingServices({ forceRerun: true, printFails: true });
  if (failing.size) {
    printDebug(`fixInfra: Auto-fix failed, recreating MZ: ${[...failing].join(', ')}`);
    await recreateMZ({
      forceDeleteDBZConnectors: true,
      deleteMZSources: true,
      deleteMZSinkConnectors: true,
      deleteMZReplicationSlots: true,
    });
  }

  failing = await getFailingServices({ forceRerun: true, printFails: true });
  if (failing.size) {
    throw getErr('fixInfra: Failed to fix, manual fix required', {
      healthchecks: [...failing],
    });
  }
  printDebug('Fixed infra', 'success');
}
