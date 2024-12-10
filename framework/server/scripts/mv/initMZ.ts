import redisFlushAll from 'utils/infra/redisFlushAll';
import { HEALTHCHECK, MODEL_NAMESPACES } from 'consts/coreRedisNamespaces';
import initInfraWrap from 'utils/infra/initInfraWrap';
import redis from 'services/redis';
import { START_DEPLOY_REDIS_KEY } from 'consts/infra';
import startDockerCompose from 'scripts/startDockerCompose';
import checkPendingMigrations from './steps/checkPendingMigrations';
import createMZViewsFromDBZ from './steps/createMZViewsFromDBZ';
import createMZViewsFromPostgres from './steps/createMZViewsFromPostgres';
import createMZViewIndexes from './steps/createMZViewIndexes';
import createMZMaterializedViews from './steps/createMZMaterializedViews';
import createMZErrorsTables from './steps/createMZErrorsTables';
import createMZSinks from './steps/createMZSinks';
import waitForMZSourcesCatchUp from './steps/waitForMZSourcesCatchUp';
import updateRRTablesComments from './steps/updateRRTablesComments';
import waitForRRTablesData from './steps/waitForRRTablesData';
import waitForMZStartUpdating from './steps/waitForMZStartUpdating';

export default function initMZ({ sourceTimeout, waitForComplete }: {
  sourceTimeout?: number,
  waitForComplete?: boolean,
} = {}) {
  // todo: high/hard create 2 separate MZ pipelines
  return initInfraWrap(async () => {
    await withErrCtx(checkPendingMigrations(), 'initMZ: checkPendingMigrations');

    await withErrCtx(startDockerCompose(), 'initMZ: startDockerCompose');

    if (await redis.get(START_DEPLOY_REDIS_KEY)) {
      return;
    }

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

    if (await redis.get(START_DEPLOY_REDIS_KEY)) {
      return;
    }

    await Promise.all([
      withErrCtx(createMZMaterializedViews(), 'initMZ: createMZMaterializedViews'),
      withErrCtx(createMZErrorsTables(), 'initMZ: createMZErrorsTables'),
    ]);
    await withErrCtx(createMZSinks(), 'initMZ: createMZSinks');

    if (await redis.get(START_DEPLOY_REDIS_KEY)) {
      return;
    }

    if (waitForComplete !== false) {
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

      if (await redis.get(START_DEPLOY_REDIS_KEY)) {
        return;
      }

      await Promise.all([
        withErrCtx(updateRRTablesComments(), 'initMZ: updateRRTablesComments'),
        withErrCtx(waitForRRTablesData(), 'initMZ: waitForRRTablesData'),
        withErrCtx(waitForMZStartUpdating(), 'initMZ: waitForMZStartUpdating'),
      ]);
    } else {
      await Promise.all([
        withErrCtx(updateRRTablesComments(), 'initMZ: updateRRTablesComments'),
        withErrCtx(waitForRRTablesData(), 'initMZ: waitForRRTablesData'),
      ]);
    }

    await withErrCtx(
      redisFlushAll([...MODEL_NAMESPACES, HEALTHCHECK]),
      'initMZ: redisFlushAll',
    );
  });
}
