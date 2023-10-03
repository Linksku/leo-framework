import pLimit from 'p-limit';

import MaterializedViewModels from 'services/model/allMaterializedViewModels';
import showMzSystemRows from 'utils/db/showMzSystemRows';
import promiseTimeout from 'utils/promiseTimeout';
import { addHealthcheck } from './HealthcheckManager';

const limiter = pLimit(3);

addHealthcheck('rrMVs', {
  deps: ['pgRR'],
  cb: async function rrMVsHealthcheck() {
    try {
      await promiseTimeout(
        showMzSystemRows('SHOW SOURCES'),
        10 * 1000,
        new Error('rrMVsHealthcheck: MZ not available'),
      );
    } catch {
      // MZ is down
      return;
    }

    const tablesMissingData: string[] = [];
    await Promise.all(
      MaterializedViewModels
        .filter(model => model.getReplicaTable())
        .map(model => limiter(async () => {
          try {
            const hasRRRows = await rawSelect(
              'SELECT 1 FROM ?? LIMIT 1',
              [model.tableName],
              { db: 'rr' },
            );
            if (hasRRRows.rows.length) {
              return;
            }

            try {
              // todo: low/easy cache hasMZRows
              const hasMZRows = await rawSelect(
                'SELECT 1 FROM ?? LIMIT 1 AS OF now()',
                [model.tableName],
                { db: 'mz' },
              );
              if (hasMZRows.rows.length) {
                tablesMissingData.push(model.type);
              }
            } catch {}
          } catch (err) {
            tablesMissingData.push(model.type);
            if (err instanceof Error && err.message.includes('does not exist')) {
              // pass
            } else if (err instanceof Error) {
              throw getErr(err, { ctx: `rrMVsHealthcheck: ${model.type}` });
            } else {
              throw err;
            }
          }
        })),
    );

    if (tablesMissingData.length) {
      throw getErr(
        'rrMVsHealthcheck: tables missing data',
        {
          numMissing: tablesMissingData.length,
          tables: tablesMissingData,
        },
      );
    }
  },
  resourceUsage: 'high',
  stability: 'mid',
  timeout: 60 * 1000,
});
