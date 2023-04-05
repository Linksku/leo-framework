import { ENABLE_DBZ } from 'consts/mz';
import redisFlushAll from 'utils/infra/redisFlushAll';
import { HEALTHCHECK, MODEL_NAMESPACES } from 'consts/coreRedisNamespaces';
import initInfraWrap from 'utils/infra/initInfraWrap';
import startMZDocker from './steps/startMZDocker';
import createMZViewsFromPostgres from './steps/createMZViewsFromPostgres';
import createMZViewsFromDBZ from './steps/createMZViewsFromDBZ';
import createMZMaterializedViews from './steps/createMZMaterializedViews';
import createMZErrorsTables from './steps/createMZErrorsTables';
import createMZSinks from './steps/createMZSinks';
import waitForRRTablesData from './steps/waitForRRTablesData';
import waitForMZSourcesCatchUp from './steps/waitForMZSourcesCatchUp';
import waitForMZStartUpdating from './steps/waitForMZStartUpdating';

export default function initMZ() {
  return initInfraWrap(async () => {
    await withErrCtx(startMZDocker(), 'initMZ: startMZDocker');

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
      ? withErrCtx(createMZViewsFromDBZ(), 'initMZ: createMZViewsFromDBZ')
      : withErrCtx(createMZViewsFromPostgres(), 'initMZ: createMZViewsFromPostgres'));

    await withErrCtx(createMZMaterializedViews(), 'initMZ: createMZMaterializedViews');
    await withErrCtx(createMZErrorsTables(), 'initMZ: createMZErrorsTables');

    await withErrCtx(createMZSinks(), 'initMZ: createMZSinks');
    await Promise.all([
      withErrCtx(waitForRRTablesData(), 'initMZ: waitForRRTablesData'),
      withErrCtx(waitForMZSourcesCatchUp(), 'initMZ: waitForMZSourcesCatchUp'),
      withErrCtx(waitForMZStartUpdating(), 'initMZ: waitForMZStartUpdating'),
    ]);
    await withErrCtx(
      redisFlushAll([...MODEL_NAMESPACES, HEALTHCHECK]),
      'initMZ: redisFlushAll',
    );
  });
}
