import type { Arguments } from 'yargs';

import waitForKafkaConnectReady from 'utils/infra/waitForKafkaConnectReady';
import withErrCtx from 'utils/withErrCtx';
import initInfraWrap from 'utils/infra/initInfraWrap';
import deleteMZSinkConnectors from './steps/deleteMZSinkConnectors';
import deleteMZSinks from './steps/deleteMZSinks';
import deleteMZSinkTopics from './steps/deleteMZSinkTopics';
import deleteMZViews from './steps/deleteMZViews';
import deleteMZSources from './steps/deleteMZSources';
import deleteRRMVData from './steps/deleteRRMVData';
import deleteMZDocker from './steps/deleteMZDocker';
import deleteDBZConnectors from './steps/deleteDBZConnectors';

export default function destroyMZ(args?: Arguments | {
  forceDeleteDBZConnectors: boolean,
  deleteMZSinkConnectors: boolean,
}) {
  return initInfraWrap(async () => {
    printDebug('Waiting for Kafka Connect to be ready', 'highlight');
    await waitForKafkaConnectReady();

    try {
      await withErrCtx(deleteMZSinks(), 'destroyMZ: deleteMZSinks');
    } catch (err) {
      printDebug(err, 'error');
    }

    if (args?.deleteMZSinkConnectors) {
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

    try {
      await withErrCtx(deleteMZViews(), 'destroyMZ: deleteMZViews');
      await withErrCtx(deleteMZSources(), 'destroyMZ: deleteMZSources');
    } catch (err) {
      printDebug(err, 'error');
    }

    try {
      await withErrCtx(deleteDBZConnectors(!!args?.forceDeleteDBZConnectors), 'destroyMZ: deleteDBZConnectors');
    } catch (err) {
      printDebug(err, 'error');
    }

    await withErrCtx(deleteMZDocker(), 'destroyMZ: deleteMZDocker');

    if (args?.deleteMZSinkConnectors) {
      // Sometimes deleting once doesn't work, maybe because MZ recreated topics
      await withErrCtx(deleteMZSinkTopics(), 'destroyMZ: deleteMZSinkTopics');
    }

    // Only delete RR after Docker volume is deleted
    await withErrCtx(deleteRRMVData(), 'destroyMZ: deleteRRMVData');
  });
}
