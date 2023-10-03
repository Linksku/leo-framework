import pLimit from 'p-limit';

import showMzSystemRows from 'utils/db/showMzSystemRows';
import getEntitiesWithMZSources from 'scripts/mv/helpers/getEntitiesWithMZSources';
import knexBT from 'services/knex/knexBT';
import retry from 'utils/retry';
import { ENABLE_DBZ, MZ_SOURCE_PG } from 'consts/mz';
import { addHealthcheck } from './HealthcheckManager';

const limiter = pLimit(3);

const entityTypes = getEntitiesWithMZSources();

addHealthcheck('mzSources', {
  cb: async function mzSourcesHealthcheck() {
    const sources = await showMzSystemRows('SHOW SOURCES');
    if (sources.length === 0) {
      throw new Error('mzSourcesHealthcheck: no sources');
    }

    if (ENABLE_DBZ) {
      if (sources.length < entityTypes.length) {
        const missingSources = [...entityTypes].filter(model => !sources.includes(model));
        throw getErr('mzSourcesHealthcheck: missing sources', { missingSources });
      }
      if (sources.length > entityTypes.length) {
        const extraSources = sources.filter(model => !(entityTypes as string[]).includes(model));
        throw getErr('mzSourcesHealthcheck: extra sources', { extraSources: extraSources.slice(0, 10) });
      }
    } else if (sources.length !== 1 || sources[0] !== MZ_SOURCE_PG) {
      throw getErr('mzSourcesHealthcheck: wrong number of sources', {
        sources: sources.filter(s => s !== MZ_SOURCE_PG),
      });
    }
  },
  resourceUsage: 'mid',
  stability: 'mid',
  timeout: 10 * 1000,
});

// Note: could fail because source topic doesn't have messages
addHealthcheck('mzSourceRows', {
  disabled: !ENABLE_DBZ,
  deps: ['mzSources'],
  cb: async function mzSourceRowsHealthcheck() {
    const numBTRows: Partial<Record<EntityType, number>> = Object.create(null);
    await Promise.all(entityTypes.map(type => limiter(async () => {
      if (type === 'mzTest') {
        const rows = await knexBT<{ version: number }>(type)
          .select(MzTest.cols.version)
          .limit(1);
        numBTRows[type] = TS.parseIntOrNull(rows[0]?.version) ?? 0;
      } else {
        const rows = await knexBT(type)
          .count({ count: '*' });
        numBTRows[type] = TS.parseIntOrNull(rows[0]?.count) ?? 0;
      }
    })));

    const remainingTypes = new Set(entityTypes.filter(type => TS.defined(numBTRows[type]) > 0));
    await retry(
      async () => {
        await Promise.all([...remainingTypes].map(type => limiter(async () => {
          // Every table should have a row from seedDb/createEachModel
          let mzRows: number;
          if (type === 'mzTest') {
            const result = await rawSelect(
              `
                SELECT version
                FROM ??
                AS OF now()
              `,
              [type],
              { db: 'mz' },
            );
            mzRows = TS.parseIntOrNull(result.rows[0]?.version) ?? 0;
          } else {
            const result = await rawSelect(
              `
                SELECT count(*) count
                FROM ??
                AS OF now()
              `,
              [type],
              { db: 'mz' },
            );
            mzRows = TS.parseIntOrNull(result.rows[0]?.count) ?? 0;
          }
          if (mzRows >= TS.defined(numBTRows[type])) {
            remainingTypes.delete(type);
          }
        })));

        if (remainingTypes.size) {
          throw getErr(
            'Tables missing data',
            { tables: [...remainingTypes] },
          );
        }
      },
      {
        timeout: 60 * 1000,
        interval: 1000,
        ctx: 'mzSourceRowsHealthcheck',
      },
    );
  },
  resourceUsage: 'high',
  stability: 'mid',
  timeout: 2 * 60 * 1000,
});
