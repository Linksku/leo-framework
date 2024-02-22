import { IS_PROFILING_API } from 'consts/infra';
import { MZ_ENABLE_CONSISTENCY_TOPIC } from 'consts/mz';
import initCheckFailingHealthchecks from './steps/initCheckFailingHealthchecks';
import monitorHealthchecks from './steps/monitorHealthchecks';
import monitorMZPrometheus from './steps/monitorMZPrometheus';
import monitorMZSinkTopics from './steps/monitorMZSinkTopics';

export default async function monitorInfra() {
  if (IS_PROFILING_API) {
    return;
  }

  printDebug('\n\n-- Start monitorInfra --', 'highlight');
  await withErrCtx(initCheckFailingHealthchecks(), 'monitorInfra: initCheckFailingHealthchecks');

  await Promise.all([
    withErrCtx(monitorHealthchecks(), 'monitorInfra: monitorHealthchecks'),
    withErrCtx(monitorMZPrometheus(), 'monitorInfra: monitorMZPrometheus'),
    MZ_ENABLE_CONSISTENCY_TOPIC
      && withErrCtx(monitorMZSinkTopics(), 'monitorInfra: monitorMZSinkTopics'),
  ]);
}
