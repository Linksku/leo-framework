import pLimit from 'p-limit';

import showMzSystemRows from 'utils/db/showMzSystemRows';
import getEntitiesWithMZSources from 'scripts/mv/helpers/getEntitiesWithMZSources';
import knexBT from 'services/knex/knexBT';
import retry from 'utils/retry';
import { addHealthcheck } from './HealthcheckManager';

const limiter = pLimit(3);

addHealthcheck('mzSources', {
  cb: async function mzSourcesHealthcheck() {
    const sources = await showMzSystemRows('SHOW SOURCES');
    if (sources.length === 0) {
      throw new Error('mzSourcesHealthcheck: no sources');
    }

    const entityTypes = new Set<string>(getEntitiesWithMZSources());
    const sourcesSet = new Set(sources);
    if (sourcesSet.size < entityTypes.size) {
      const missingSources = [...entityTypes].filter(model => !sourcesSet.has(model));
      throw getErr('mzSourcesHealthcheck: missing sources', { missingSources });
    }
    if (sourcesSet.size > entityTypes.size) {
      const extraSources = [...sourcesSet].filter(model => !entityTypes.has(model));
      throw getErr('mzSourcesHealthcheck: extra sources', { extraSources: extraSources.slice(0, 10) });
    }
  },
  resourceUsage: 'mid',
  stability: 'mid',
  timeout: 10 * 1000,
});

// Note: could fail because source topic doesn't have messages
addHealthcheck('mzSourceRows', {
  deps: ['mzSources'],
  cb: async function mzSourceRowsHealthcheck() {
    const entityTypes = getEntitiesWithMZSources();
    const numBTRows: Partial<Record<EntityType, number>> = {};
    await Promise.all(entityTypes.map(type => limiter(async () => {
      if (type === 'mzTest') {
        const rows = await knexBT(type)
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
              'mz',
              `
                SELECT version
                FROM ??
                AS OF now()
              `,
              [type],
            );
            mzRows = TS.parseIntOrNull(result.rows[0]?.version) ?? 0;
          } else {
            const result = await rawSelect(
              'mz',
              `
                SELECT count(*) count
                FROM ??
                AS OF now()
              `,
              [type],
            );
            mzRows = TS.parseIntOrNull(result.rows[0]?.count) ?? 0;
          }
          if (mzRows >= TS.defined(numBTRows[type])) {
            remainingTypes.delete(type);
          }
        })));

        if (remainingTypes.size) {
          throw getErr(
            'mzSourceRowsHealthcheck: tables missing data',
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
  timeout: 60 * 1000,
});
