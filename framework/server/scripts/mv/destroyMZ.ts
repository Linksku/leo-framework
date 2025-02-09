import type { Arguments } from 'yargs';

import {
  DBZ_FOR_INSERT_ONLY,
  DBZ_FOR_UPDATEABLE,
  MZ_ENABLE_CONSISTENCY_TOPIC,
  MZ_SINK_TOPIC_PREFIX,
} from 'consts/mz';
import waitForKafkaConnectReady from 'utils/infra/waitForKafkaConnectReady';
import initInfraWrap from 'utils/infra/initInfraWrap';
import isMzRunning from 'utils/infra/isMzRunning';
import deleteTopicsAndSchema from 'utils/infra/deleteTopicsAndSchema';
import MaterializedViewModels from 'core/models/allMaterializedViewModels';
import { HAS_MVS } from 'config/__generated__/consts';
import deleteMZSinkConnectors from './steps/deleteMZSinkConnectors';
import deleteMZSinks from './steps/deleteMZSinks';
import deleteMZViews from './steps/deleteMZViews';
import deleteMZSources from './steps/deleteMZSources';
import deleteRRData from './steps/deleteRRData';
import deleteDBZConnectors from './steps/deleteDBZConnectors';
import deleteMZDocker from './steps/deleteMZDocker';
import deleteMZReplicationSlots from './steps/deleteMZReplicationSlots';

type Props = {
  deleteRRMVData?: boolean,
  deleteMZSinkConnectors?: boolean,
  deleteMZSources?: boolean,
  forceDeleteDBZConnectors?: boolean,
  deleteMZReplicationSlots?: boolean,
};

// todo: low/mid put a wrapper around server scripts for types
export default async function destroyMZ(args?: Arguments<Props> | Props) {
  if (!HAS_MVS) {
    return;
  }

  const shouldDeleteSinkConnectors = !MZ_ENABLE_CONSISTENCY_TOPIC
    || args?.deleteMZSinkConnectors
    || args?.deleteRRMVData;
  const shouldDeleteMZSources = args?.deleteMZReplicationSlots
    || args?.forceDeleteDBZConnectors
    || args?.deleteMZSources;
  const shouldDeleteRRMVData = args?.deleteRRMVData;

  await initInfraWrap(async () => {
    const { mzRunning } = await promiseObj({
      _: waitForKafkaConnectReady(),
      mzRunning: isMzRunning(),
    });
    const shouldDeleteMZDocker = shouldDeleteMZSources
      || args?.deleteMZReplicationSlots
      || !mzRunning;

    await Promise.all([
      shouldDeleteSinkConnectors
        ? (async () => {
          try {
            await withErrCtx(deleteMZSinkConnectors(), 'destroyMZ: deleteMZSinkConnectors');
          } catch (err) {
            printDebug(err, 'error');
          }

          try {
            await withErrCtx(
              () => deleteTopicsAndSchema(MZ_SINK_TOPIC_PREFIX),
              'destroyMZ: deleteMZSinkTopics',
            );
          } catch (err) {
            printDebug(err, 'error');
          }
        })()
        : null,

      !shouldDeleteMZDocker
        ? (async () => {
          try {
            await withErrCtx(deleteMZSinks(), 'destroyMZ: deleteMZSinks');
          } catch (err) {
            printDebug(err, 'error');
          }

          try {
            await withErrCtx(deleteMZViews(), 'destroyMZ: deleteMZViews');
            if (shouldDeleteMZSources) {
              await withErrCtx(deleteMZSources(), 'destroyMZ: deleteMZSources');
            }
          } catch (err) {
            printDebug(err, 'error');
          }
        })()
        : null,
    ]);

    await Promise.all([
      shouldDeleteMZDocker
        ? withErrCtx(deleteMZDocker(), 'destroyMZ: deleteMZDocker')
          .catch(err => printDebug(err, 'error'))
        : null,

      withErrCtx(
        deleteDBZConnectors(
          !!args?.forceDeleteDBZConnectors
            || (!DBZ_FOR_UPDATEABLE && !DBZ_FOR_INSERT_ONLY)
            || !!args?.deleteMZReplicationSlots,
        ),
        'destroyMZ: deleteDBZConnectors',
      )
        .catch(err => printDebug(err, 'error')),
    ]);

    try {
      await Promise.all([
        shouldDeleteSinkConnectors
          // Sometimes deleting once doesn't work, maybe because MZ recreated topics
          ? withErrCtx(
            () => deleteTopicsAndSchema(MZ_SINK_TOPIC_PREFIX),
            'destroyMZ: deleteMZSinkTopics',
          )
            .catch(err => printDebug(err, 'error'))
          : null,

        args?.deleteMZReplicationSlots
          ? withErrCtx(deleteMZReplicationSlots(), 'destroyMZ: deleteMZReplicationSlots')
          : null,

        // Only delete RR after Docker volume is deleted
        shouldDeleteRRMVData
          ? withErrCtx(
            deleteRRData(MaterializedViewModels.map(r => r.tableName)),
            'destroyMZ: deleteRRData',
          )
          : null,
      ]);
    } catch (err) {
      printDebug('destroyMZ failed');
      throw err;
    }
  });
  await pause(1000);
}
