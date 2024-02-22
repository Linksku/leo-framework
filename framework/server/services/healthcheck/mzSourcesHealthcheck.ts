import throttledPromiseAll from 'utils/throttledPromiseAll';
import showMzSystemRows from 'utils/db/showMzSystemRows';
import getEntitiesForMZSources from 'scripts/mv/helpers/getEntitiesForMZSources';
import knexBT from 'services/knex/knexBT';
import retry, { forceStopRetry } from 'utils/retry';
import {
  DBZ_FOR_INSERT_ONLY,
  DBZ_FOR_UPDATEABLE,
  MZ_SOURCE_PG,
  MZ_TIMESTAMP_FREQUENCY,
} from 'consts/mz';
import { addHealthcheck } from './HealthcheckManager';

const dbzEntities = getEntitiesForMZSources('kafka');
const pgEntities = getEntitiesForMZSources('pg');
const shouldHavePgSource = !DBZ_FOR_UPDATEABLE || !DBZ_FOR_INSERT_ONLY;

addHealthcheck('mzSources', {
  cb: async function mzSourcesHealthcheck() {
    const existingSources = await showMzSystemRows('SHOW SOURCES');
    if (existingSources.length === 0) {
      throw new Error('mzSourcesHealthcheck: no sources');
    }

    const hasPgSource = existingSources.includes(MZ_SOURCE_PG);
    const dbzSources = existingSources.filter(name => name !== MZ_SOURCE_PG);

    if (dbzSources.length < dbzEntities.length) {
      const missingSources = dbzEntities
        .map(Model => Model.type)
        .filter(type => !dbzSources.includes(type));
      throw getErr('mzSourcesHealthcheck: missing sources', { missingSources });
    }
    if (dbzSources.length > dbzEntities.length) {
      const extraSources = dbzSources
        .filter(name => !dbzEntities.some(Model => Model.type === name));
      throw getErr('mzSourcesHealthcheck: extra sources', {
        extraSources: extraSources.slice(0, 10),
      });
    }

    if (shouldHavePgSource && !hasPgSource) {
      throw getErr('mzSourcesHealthcheck: missing PG source', {
        sources: existingSources.slice(0, 10),
      });
    }
    if (!shouldHavePgSource && hasPgSource) {
      throw new Error('mzSourcesHealthcheck: extra PG source');
    }
  },
  resourceUsage: 'mid',
  usesResource: 'mz',
  stability: 'mid',
  timeout: 2 * 60 * 1000,
});

// Note: could fail because source topic doesn't have messages
// Note: this error could be caused by inserting with an invalid publication:
//   Source error: u1/3: file IO: source table foo with oid 123 has been altered
addHealthcheck('mzDbzSourceRows', {
  disabled: !DBZ_FOR_UPDATEABLE && !DBZ_FOR_INSERT_ONLY,
  deps: ['mzSources'],
  cb: async function mzDbzSourceRowsHealthcheck() {
    const numBTRows: Partial<Record<EntityType, number>> = Object.create(null);
    await throttledPromiseAll(3, dbzEntities, async Entity => {
      if (Entity.type === 'mzTest') {
        const rows = await knexBT<{ version: number }>(Entity.type)
          .select(MzTestModel.cols.version)
          .limit(1);
        numBTRows[Entity.type] = TS.parseIntOrNull(rows[0]?.version) ?? 0;
      } else {
        const rows = await knexBT(Entity.type)
          .count({ count: '*' });
        numBTRows[Entity.type] = TS.parseIntOrNull(rows[0]?.count) ?? 0;
      }
    });

    const remainingEntities = new Set(
      dbzEntities.filter(Entity => TS.defined(numBTRows[Entity.type]) > 0),
    );
    await retry(
      async () => {
        await throttledPromiseAll(3, remainingEntities, async Entity => {
          // Every table should have a row from seedDb/createEachModel
          let mzRows: number;
          try {
            if (Entity.type === 'mzTest') {
              const result = await rawSelect(
                'mz',
                `
                  SELECT version
                  FROM ??
                  AS OF now() + INTERVAL '${MZ_TIMESTAMP_FREQUENCY} MILLISECOND'
                `,
                [Entity.type],
              );
              mzRows = TS.parseIntOrNull(result.rows[0]?.version) ?? 0;
            } else {
              const result = await rawSelect(
                'mz',
                `
                  SELECT count(*) count
                  FROM ??
                  AS OF now() + INTERVAL '${MZ_TIMESTAMP_FREQUENCY} MILLISECOND'
                `,
                [Entity.type],
              );
              mzRows = TS.parseIntOrNull(result.rows[0]?.count) ?? 0;
            }
          } catch (err) {
            throw forceStopRetry(err);
          }

          if (mzRows >= TS.defined(numBTRows[Entity.type])) {
            remainingEntities.delete(Entity);
          }
        });

        if (remainingEntities.size) {
          throw getErr('Tables missing DBZ data', {
            tables: [...remainingEntities].map(Entity => Entity.type),
          });
        }
      },
      {
        timeout: 2 * 60 * 1000,
        interval: 1000,
        ctx: 'mzDbzSourceRowsHealthcheck',
      },
    );
  },
  resourceUsage: 'high',
  usesResource: 'mz',
  stability: 'mid',
  timeout: 2 * 60 * 1000,
});

addHealthcheck('mzPgSourceRows', {
  disabled: DBZ_FOR_UPDATEABLE && DBZ_FOR_INSERT_ONLY,
  deps: ['mzSources'],
  cb: async function mzPgSourceRowsHealthcheck() {
    const remainingEntities = new Set(pgEntities);
    await retry(
      async () => {
        await throttledPromiseAll(3, [...remainingEntities], async Entity => {
          try {
            const result = await rawSelect(
              'mz',
              `
                SELECT count(*) count
                FROM ??
                AS OF now() + INTERVAL '${MZ_TIMESTAMP_FREQUENCY} MILLISECOND'
              `,
              [Entity.type],
            );
            if (result.rows[0]?.count) {
              remainingEntities.delete(Entity);
            }
          } catch (err) {
            throw forceStopRetry(err);
          }
        });

        if (remainingEntities.size) {
          throw getErr('Tables missing PG data', {
            tables: [...remainingEntities].map(Entity => Entity.type),
          });
        }
      },
      {
        timeout: 2 * 60 * 1000,
        interval: 1000,
        ctx: 'mzPgSourceRowsHealthcheck',
      },
    );
  },
  resourceUsage: 'mid',
  usesResource: 'mz',
  stability: 'mid',
  timeout: 2 * 60 * 1000,
});
