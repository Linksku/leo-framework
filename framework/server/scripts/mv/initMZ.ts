import { ENABLE_DBZ } from 'consts/mz';
import startMZDocker from './steps/startMZDocker';
import createMZViewsFromPostgres from './steps/createMZViewsFromPostgres';
import createMZViewsFromDebezium from './steps/createMZViewsFromDebezium';
import createMZMaterializedViews from './steps/createMZMaterializedViews';
import createMZSinks from './steps/createMZSinks';
import createMZSinkConnectors from './steps/createMZSinkConnectors';

export default async function initMZ() {
  await startMZDocker();

  /*
  Postgres WAL shipping cons:
    - 1 materialized view per source
    - no append-only mode

  Debezium cons:
    - slow snapshot
    - higher CPU

  For both:
  - replica identity should be FULL, otherwise MZ uses more memory
  */
  await (ENABLE_DBZ
    ? createMZViewsFromDebezium()
    : createMZViewsFromPostgres());

  await createMZMaterializedViews();

  await createMZSinks();
  await createMZSinkConnectors();
}
