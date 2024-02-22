import throttledPromiseAll from 'utils/throttledPromiseAll';
import MaterializedViewModels from 'services/model/allMaterializedViewModels';
import showMzSystemRows from 'utils/db/showMzSystemRows';
import promiseTimeout from 'utils/promiseTimeout';
import { MZ_TIMESTAMP_FREQUENCY } from 'consts/mz';
import { addHealthcheck } from './HealthcheckManager';

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
    const tablesUnknown: string[] = [];
    const modelsWithSinks = MaterializedViewModels
      .filter(model => model.getReplicaTable());
    await throttledPromiseAll(3, modelsWithSinks, async model => {
      try {
        const hasRRRows = await rawSelect(
          'rr',
          'SELECT 1 FROM ?? LIMIT 1',
          [model.tableName],
        );
        if (hasRRRows.rows.length) {
          return;
        }

        try {
          // todo: low/easy cache hasMZRows
          const hasMZRows = await rawSelect(
            'mz',
            `
              SELECT 1
              FROM ??
              LIMIT 1
              AS OF now() + INTERVAL '${MZ_TIMESTAMP_FREQUENCY} MILLISECOND'
            `,
            [model.tableName],
          );
          if (hasMZRows.rows.length) {
            tablesMissingData.push(model.type);
          }
        } catch {
          // Table has no rows and MZ is down, so don't know if table should have rows
          tablesUnknown.push(model.type);
        }
      } catch (err) {
        if (err instanceof Error && err.message.includes('does not exist')) {
          tablesMissingData.push(model.type);
        } else if (err instanceof Error) {
          throw getErr(err, { ctx: `rrMVsHealthcheck: ${model.type}` });
        } else {
          throw err;
        }
      }
    });

    if (tablesMissingData.length) {
      throw getErr(
        'rrMVsHealthcheck: tables missing data',
        {
          numMissing: tablesMissingData.length,
          tables: tablesMissingData,
          tablesUnknown,
        },
      );
    }
    if (tablesUnknown.length > modelsWithSinks.length / 2) {
      throw getErr(
        'rrMVsHealthcheck: tables likely missing data',
        {
          numUnknown: tablesUnknown.length,
          tablesUnknown,
        },
      );
    }
  },
  resourceUsage: 'high',
  usesResource: 'rr',
  stability: 'mid',
  timeout: 2 * 60 * 1000,
});
