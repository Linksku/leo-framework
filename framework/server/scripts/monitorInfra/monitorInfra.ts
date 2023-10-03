import { IS_PROFILING_API } from 'serverSettings';
import { ENABLE_DBZ } from 'consts/mz';
import initCheckFailingHealthchecks from './steps/initCheckFailingHealthchecks';
import monitorHealthchecks from './steps/monitorHealthchecks';
import monitorMZPrometheus from './steps/monitorMZPrometheus';
import monitorMZSinkTopics from './steps/monitorMZSinkTopics';

export default async function monitorInfra() {
  if (IS_PROFILING_API) {
    return;
  }

  await withErrCtx(initCheckFailingHealthchecks(), 'monitorInfra: initCheckFailingHealthchecks');

  await Promise.all([
    withErrCtx(monitorHealthchecks(), 'monitorInfra: monitorHealthchecks'),
    withErrCtx(monitorMZPrometheus(), 'monitorInfra: monitorMZPrometheus'),
    ENABLE_DBZ && withErrCtx(monitorMZSinkTopics(), 'monitorInfra: monitorMZSinkTopics'),
  ]);
}
