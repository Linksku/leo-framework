import { IS_PROFILING_APIS } from 'config';
import { MZ_ENABLE_CONSISTENCY_TOPIC } from 'consts/mz';
import EntityModels from 'core/models/allEntityModels';
import { HAS_MVS } from 'config/__generated__/consts';
import initCheckFailingHealthchecks from './steps/initCheckFailingHealthchecks';
import monitorHealthchecks from './steps/monitorHealthchecks';
import monitorMZPrometheus from './steps/monitorMZPrometheus';
import monitorMZSinkTopics from './steps/monitorMZSinkTopics';

export default async function monitorInfra() {
  if (IS_PROFILING_APIS
    // Rebuilding generated models
    || (!process.env.PRODUCTION && !EntityModels.length)) {
    return;
  }

  printDebug('\n\n-- Start monitorInfra --', 'highlight');
  await withErrCtx(initCheckFailingHealthchecks(), 'monitorInfra: initCheckFailingHealthchecks');

  if (HAS_MVS) {
    await Promise.all([
      withErrCtx(monitorHealthchecks(), 'monitorInfra: monitorHealthchecks'),
      withErrCtx(monitorMZPrometheus(), 'monitorInfra: monitorMZPrometheus'),
      MZ_ENABLE_CONSISTENCY_TOPIC
        && withErrCtx(monitorMZSinkTopics(), 'monitorInfra: monitorMZSinkTopics'),
    ]);
  } else {
    await withErrCtx(monitorHealthchecks(), 'monitorInfra: monitorHealthchecks');
  }
}
