import throttledPromiseAll from 'utils/throttledPromiseAll';
import EntityModels from 'core/models/allEntityModels';
import { HAS_MVS } from 'config/__generated__/consts';
import { addHealthcheck } from './HealthcheckManager';

addHealthcheck('rrEntities', {
  disabled: !HAS_MVS,
  deps: ['pgRR'],
  run: async function rrEntitiesHealthcheck() {
    const tablesMissingData: string[] = [];
    await throttledPromiseAll(3, EntityModels, async model => {
      // Every table should have a row from seedDb/createEachModel
      try {
        const hasRRRows = await rawSelect(
          'rr',
          'SELECT 1 FROM ?? LIMIT 1',
          [model.tableName],
        );
        if (!hasRRRows.rows.length) {
          tablesMissingData.push(model.type);
        }
      } catch (err) {
        tablesMissingData.push(model.type);
        if (err instanceof Error && err.message.includes('does not exist')) {
          // pass
        } else if (err instanceof Error) {
          throw getErr(err, { ctx: `rrEntitiessHealthcheck: ${model.type}` });
        } else {
          throw err;
        }
      }
    });

    if (tablesMissingData.length) {
      throw getErr(
        'rrEntitiesHealthcheck: tables missing data',
        {
          numMissing: tablesMissingData.length,
          tables: tablesMissingData,
        },
      );
    }
  },
  resourceUsage: 'high',
  usesResource: 'rr',
  stability: 'high',
  timeout: 60 * 1000,
});
