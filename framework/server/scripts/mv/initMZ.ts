import { ENABLE_DBZ } from 'consts/mz';
import redisFlushAll from 'utils/infra/redisFlushAll';
import { HEALTHCHECK, MODEL_NAMESPACES } from 'consts/coreRedisNamespaces';
import initInfraWrap from 'utils/infra/initInfraWrap';
import checkDidMigrations from './steps/checkDidMigrations';
import startMZDocker from './steps/startMZDocker';
import createMZViewsFromPostgres from './steps/createMZViewsFromPostgres';
import createMZViewsFromDBZ from './steps/createMZViewsFromDBZ';
import createMZMaterializedViews from './steps/createMZMaterializedViews';
import createMZErrorsTables from './steps/createMZErrorsTables';
import createMZSinks from './steps/createMZSinks';
import waitForRRTablesData from './steps/waitForRRTablesData';
import waitForMZStartUpdating from './steps/waitForMZStartUpdating';
import waitForMZSourcesCatchUp from './steps/waitForMZSourcesCatchUp';

export default function initMZ({ sourceTimeout }: {
  sourceTimeout?: number,
} = {}) {
  return initInfraWrap(async () => {
    await withErrCtx(checkDidMigrations(), 'initMZ: checkDidMigrations');

    await withErrCtx(startMZDocker(), 'initMZ: startMZDocker');

    /*
    Postgres WAL shipping cons:
      - no append-only mode
      - can't reuse sink topic

    Debezium cons:
      - slower
      - DBZ crashes

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
      withErrCtx(
        waitForMZSourcesCatchUp(true, sourceTimeout),
        'initMZ: waitForMZSourcesCatchUp insert-only',
      ),
      withErrCtx(
        waitForMZSourcesCatchUp(false, sourceTimeout),
        'initMZ: waitForMZSourcesCatchUp updateable',
      ),
    ]);
    await Promise.all([
      withErrCtx(waitForRRTablesData(), 'initMZ: waitForRRTablesData'),
      withErrCtx(waitForMZStartUpdating(), 'initMZ: waitForMZStartUpdating'),
    ]);

    await withErrCtx(
      redisFlushAll([...MODEL_NAMESPACES, HEALTHCHECK]),
      'initMZ: redisFlushAll',
    );
  });
}
