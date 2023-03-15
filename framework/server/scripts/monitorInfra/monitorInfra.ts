import initCheckFailingHealthchecks from './steps/initCheckFailingHealthchecks';
import monitorHealthchecks from './steps/monitorHealthchecks';
import monitorMZPrometheus from './steps/monitorMZPrometheus';
import monitorMZSinkTopics from './steps/monitorMZSinkTopics';

// todo: high/mid write logs to file in dev to debug
export default async function monitorInfra() {
  await initCheckFailingHealthchecks();

  await Promise.all([
    monitorHealthchecks(),
    monitorMZPrometheus(),
    monitorMZSinkTopics(),
  ]);
}
