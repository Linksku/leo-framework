import redisFlushAll from 'utils/infra/redisFlushAll';
import { HEALTHCHECK, MODEL_NAMESPACES } from 'consts/coreRedisNamespaces';
import initInfraWrap from 'utils/infra/initInfraWrap';
import checkPendingMigrations from './steps/checkPendingMigrations';
import startDockerCompose from './steps/startDockerCompose';
import createMZViewsFromDBZ from './steps/createMZViewsFromDBZ';
import createMZViewsFromPostgres from './steps/createMZViewsFromPostgres';
import createMZViewIndexes from './steps/createMZViewIndexes';
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
    await withErrCtx(checkPendingMigrations(), 'initMZ: checkPendingMigrations');

    await withErrCtx(startDockerCompose(), 'initMZ: startDockerCompose');

    /*
    Postgres WAL shipping cons:
      - no append-only mode
      - can't reuse sink topic

    Debezium cons:
      - slower
      - DBZ crashes

    For both:
    - replica identity should be FULL, otherwise MZ uses more memory

    Maybe aggregate before importing in MZ. ksqlDB doesn't support enough features
    */
    // todo: high/hard do preprocessing in Flink etc
    await Promise.all([
      withErrCtx(createMZViewsFromDBZ(), 'initMZ: createMZViewsFromDBZ'),
      withErrCtx(createMZViewsFromPostgres(), 'initMZ: createMZViewsFromPostgres'),
    ]);
    await withErrCtx(createMZViewIndexes(), 'initMZ: createMZViewIndexes');

    await Promise.all([
      withErrCtx(createMZMaterializedViews(), 'initMZ: createMZMaterializedViews'),
      withErrCtx(createMZErrorsTables(), 'initMZ: createMZErrorsTables'),
    ]);
    await withErrCtx(createMZSinks(), 'initMZ: createMZSinks');

    // todo: mid/hard detect if MZ crashes while waiting
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
