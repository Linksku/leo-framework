import throttledPromiseAll from 'utils/throttledPromiseAll';
import showMzSystemRows from 'utils/db/showMzSystemRows';
import getEntitiesForMZSources from 'scripts/mv/helpers/getEntitiesForMZSources';
import retry, { forceStopRetry } from 'utils/retry';
import {
  DBZ_FOR_INSERT_ONLY,
  DBZ_FOR_UPDATEABLE,
  MZ_SOURCE_PG,
  MZ_TIMESTAMP_FREQUENCY,
} from 'consts/mz';
import { addHealthcheck } from './HealthcheckManager';

const dbzEntities = getEntitiesForMZSources('dbz');
const pgEntities = getEntitiesForMZSources('pg');
const shouldHavePgSource = !DBZ_FOR_UPDATEABLE || !DBZ_FOR_INSERT_ONLY;

addHealthcheck('mzSources', {
  run: async function mzSourcesHealthcheck() {
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
  run: async function mzDbzSourceRowsHealthcheck() {
    const hasBTRows: Partial<Record<EntityType, boolean>> = Object.create(null);
    await throttledPromiseAll(3, dbzEntities, async Entity => {
      if (Entity.type === 'mzTest') {
        const rows = await entityQuery(MzTestModel, 'bt')
          .select(MzTestModel.cols.version)
          .limit(1);
        hasBTRows[Entity.type] = !!rows[0]?.version;
      } else {
        const rows = await entityQuery(Entity, 'bt')
          .select(raw('1'))
          .limit(1);
        hasBTRows[Entity.type] = !!rows.length;
      }
    });

    const entitiesWithBTRows = dbzEntities.filter(Entity => hasBTRows[Entity.type]);
    const emptyTables = new Set<EntityType>();
    const timedOutTables = new Set<EntityType>();
    await throttledPromiseAll(3, entitiesWithBTRows, async Entity => {
      // Every table should have a row from seedDb/createEachModel
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
            { timeout: 10 * 1000 },
          );
          if (!result.rows[0]?.version) {
            emptyTables.add(Entity.type);
          }
        } else {
          const result = await rawSelect(
            'mz',
            `
              SELECT 1
              FROM ??
              LIMIT 1
              AS OF now() + INTERVAL '${MZ_TIMESTAMP_FREQUENCY} MILLISECOND'
            `,
            [Entity.type],
            { timeout: 10 * 1000 },
          );
          if (!result.rows.length) {
            emptyTables.add(Entity.type);
          }
        }
      } catch (err) {
        if (!(err instanceof Error)
          || (!err.message.includes('Timeout acquiring a connection')
            && !err.message.includes('Defined query timeout'))) {
          throw err;
        }
        timedOutTables.add(Entity.type);
      }
    });

    if (emptyTables.size) {
      throw getErr('Tables missing DBZ data', {
        tables: [...emptyTables],
      });
    }
    // When MZ is ingesting from DBZ, tables often time out
    if (timedOutTables.size > entitiesWithBTRows.length / 2) {
      printDebug(getErr(
        'mzDbzSourceRowsHealthcheck: too many tables timed out',
        {
          timedOutTables: [...timedOutTables],
        },
      ), 'warn');
    }
  },
  resourceUsage: 'high',
  usesResource: 'mz',
  stability: 'mid',
  timeout: 2 * 60 * 1000,
});

addHealthcheck('mzPgSourceRows', {
  disabled: DBZ_FOR_UPDATEABLE && DBZ_FOR_INSERT_ONLY,
  deps: ['mzSources'],
  run: async function mzPgSourceRowsHealthcheck() {
    const remainingEntities = new Set(pgEntities);
    await retry(
      async () => {
        await throttledPromiseAll(3, [...remainingEntities], async Entity => {
          try {
            const result = await rawSelect(
              'mz',
              `
                SELECT 1
                FROM ??
                LIMIT 1
                AS OF now() + INTERVAL '${MZ_TIMESTAMP_FREQUENCY} MILLISECOND'
              `,
              [Entity.type],
              { timeout: 10 * 1000 },
            );
            if (result.rows.length) {
              remainingEntities.delete(Entity);
            }
          } catch (err) {
            if (err instanceof Error
              && (err.message.includes('Timeout acquiring a connection')
                || err.message.includes('Defined query timeout'))) {
              throw err;
            }
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
