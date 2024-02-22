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
import deleteMZSinkConnectors from './steps/deleteMZSinkConnectors';
import deleteMZSinks from './steps/deleteMZSinks';
import deleteMZViews from './steps/deleteMZViews';
import deleteMZSources from './steps/deleteMZSources';
import deleteRRMVData from './steps/deleteRRMVData';
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

// todo: low/mid fix yargs Arguments type
export default async function destroyMZ(args?: Arguments<Props> | Props) {
  const shouldDeleteSinkConnectors = !MZ_ENABLE_CONSISTENCY_TOPIC
    || args?.deleteMZSinkConnectors
    || args?.deleteRRMVData;
  const shouldDeleteMZSources = args?.deleteMZReplicationSlots
    ?? args?.forceDeleteDBZConnectors
    ?? args?.deleteMZSources;
  const shouldDeleteRRMVData = shouldDeleteSinkConnectors;

  await initInfraWrap(async () => {
    printDebug('Waiting for Kafka Connect to be ready', 'highlight');
    await waitForKafkaConnectReady();

    const mzRunning = await isMzRunning();
    if (mzRunning) {
      try {
        await withErrCtx(deleteMZSinks(), 'destroyMZ: deleteMZSinks');
      } catch (err) {
        printDebug(err, 'error');
      }
    }

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

      (async () => {
        if (mzRunning) {
          try {
            await withErrCtx(deleteMZViews(), 'destroyMZ: deleteMZViews');
            if (shouldDeleteMZSources) {
              await withErrCtx(deleteMZSources(), 'destroyMZ: deleteMZSources');
            }
          } catch (err) {
            printDebug(err, 'error');
          }
        }
      })(),
    ]);

    await Promise.all([
      shouldDeleteMZSources || args?.deleteMZReplicationSlots || !mzRunning
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
        ? withErrCtx(deleteRRMVData(), 'destroyMZ: deleteRRMVData')
        : null,
    ]);
  });
  await pause(1000);
}
