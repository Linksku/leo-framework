import initCheckFailingHealthchecks from './steps/initCheckFailingHealthchecks';
import monitorHealthchecks from './steps/monitorHealthchecks';
import monitorMZPrometheus from './steps/monitorMZPrometheus';
import monitorMZSinkTopics from './steps/monitorMZSinkTopics';

// todo: high/mid write logs to file in dev to debug
export default async function monitorInfra() {
  await withErrCtx(initCheckFailingHealthchecks(), 'monitorInfra: initCheckFailingHealthchecks');

  await Promise.all([
    withErrCtx(monitorHealthchecks(), 'monitorInfra: monitorHealthchecks'),
    withErrCtx(monitorMZPrometheus(), 'monitorInfra: monitorMZPrometheus'),
    withErrCtx(monitorMZSinkTopics(), 'monitorInfra: monitorMZSinkTopics'),
  ]);
}
