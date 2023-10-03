import type { Arguments } from 'yargs';

import { ENABLE_DBZ } from 'consts/mz';
import waitForKafkaConnectReady from 'utils/infra/waitForKafkaConnectReady';
import initInfraWrap from 'utils/infra/initInfraWrap';
import isMzRunning from 'utils/infra/isMzRunning';
import deleteMZSinkConnectors from './steps/deleteMZSinkConnectors';
import deleteMZSinks from './steps/deleteMZSinks';
import deleteMZSinkTopics from './steps/deleteMZSinkTopics';
import deleteMZViews from './steps/deleteMZViews';
import deleteMZSources from './steps/deleteMZSources';
import deleteRRMVData from './steps/deleteRRMVData';
import deleteDBZConnectors from './steps/deleteDBZConnectors';
import deleteMZDocker from './steps/deleteMZDocker';

export default async function destroyMZ(args?: Arguments | {
  forceDeleteDBZConnectors?: boolean,
  deleteMZSources?: boolean,
  deleteMZSinkConnectors?: boolean,
}) {
  const shouldDeleteMZSources = args?.deleteMZSources ?? args?.forceDeleteDBZConnectors;
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

    if (args?.deleteMZSinkConnectors || !ENABLE_DBZ) {
      try {
        await withErrCtx(deleteMZSinkConnectors(), 'destroyMZ: deleteMZSinkConnectors');
      } catch (err) {
        printDebug(err, 'error');
      }

      try {
        await withErrCtx(deleteMZSinkTopics(), 'destroyMZ: deleteMZSinkTopics');
      } catch (err) {
        printDebug(err, 'error');
      }
    }

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

    try {
      await withErrCtx(
        deleteDBZConnectors(!!args?.forceDeleteDBZConnectors || !ENABLE_DBZ),
        'destroyMZ: deleteDBZConnectors',
      );
    } catch (err) {
      printDebug(err, 'error');
    }

    if (shouldDeleteMZSources || !mzRunning) {
      await withErrCtx(deleteMZDocker(), 'destroyMZ: deleteMZDocker');
    }

    // Sometimes deleting once doesn't work, maybe because MZ recreated topics
    if (args?.deleteMZSinkConnectors || !ENABLE_DBZ) {
      await withErrCtx(deleteMZSinkTopics(), 'destroyMZ: deleteMZSinkTopics');
    }

    // Only delete RR after Docker volume is deleted
    await withErrCtx(deleteRRMVData(), 'destroyMZ: deleteRRMVData');
  });
  await pause(1000);
}
