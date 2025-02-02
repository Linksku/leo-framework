import throttledPromiseAll from 'utils/throttledPromiseAll';
import MaterializedViewModels from 'core/models/allMaterializedViewModels';
import showMzSystemRows from 'utils/db/showMzSystemRows';
import promiseTimeout from 'utils/promiseTimeout';
import { MZ_TIMESTAMP_FREQUENCY } from 'consts/mz';
import { HAS_MVS } from 'config/__generated__/consts';
import { addHealthcheck } from './HealthcheckManager';

// todo: mid/mid in case of incorrect columns, delete specific tables
addHealthcheck('rrMVs', {
  disabled: !HAS_MVS,
  deps: ['pgRR'],
  run: async function rrMVsHealthcheck() {
    try {
      await promiseTimeout(
        showMzSystemRows('SHOW SOURCES'),
        {
          timeout: 10 * 1000,
          getErr: () => new Error('rrMVsHealthcheck: MZ not available'),
        },
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
        const { hasRRRows, colsRow } = await promiseObj({
          hasRRRows: rawSelect(
            'rr',
            'SELECT 1 FROM ?? LIMIT 1',
            [model.tableName],
          ),
          colsRow: rawSelect(
            'rr',
            `
              SELECT *
              FROM ??
              WHERE false
              LIMIT 1
            `,
            [model.tableName],
          ),
        });

        const fields = colsRow.fields.map(f => f.name);
        for (const f of fields) {
          if (!TS.hasProp(model.getSchema(), f)) {
            throw new Error(`rrMVsHealthcheck: extra column ${model.tableName}.${f}`);
          }
        }
        for (const prop of Object.keys(model.getSchema())) {
          if (!fields.includes(prop)) {
            throw new Error(`rrMVsHealthcheck: missing column ${model.tableName}.${prop}`);
          }
        }

        if (hasRRRows.rows.length) {
          return;
        }

        try {
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
      const err = getErr(
        'rrMVsHealthcheck: tables missing data',
        {
          numMissing: tablesMissingData.length,
          tables: tablesMissingData,
          tablesUnknown,
        },
      );
      if (tablesMissingData.length > modelsWithSinks.length / 10) {
        throw err;
      }
      printDebug(err, 'warn');
    }
    if (tablesUnknown.length) {
      const err = getErr(
        'rrMVsHealthcheck: tables likely missing data',
        {
          numUnknown: tablesUnknown.length,
          tablesUnknown,
        },
      );
      if (tablesUnknown.length > modelsWithSinks.length / 2) {
        throw err;
      }
      printDebug(err, 'warn');
    }
  },
  resourceUsage: 'high',
  usesResource: 'rr',
  stability: 'mid',
  timeout: 2 * 60 * 1000,
});
