import pLimit from 'p-limit';

import EntityModels from 'services/model/allEntityModels';
import { addHealthcheck } from './HealthcheckManager';

const limiter = pLimit(3);

addHealthcheck('rrEntities', {
  deps: ['pgRR'],
  cb: async function rrEntitiesHealthcheck() {
    const tablesMissingData: string[] = [];
    await Promise.all(
      EntityModels
        .map(model => limiter(async () => {
          // Every table should have a row from seedDb/createEachModel
          try {
            const hasRRRows = await rawSelect('rr', 'SELECT 1 FROM ?? LIMIT 1', [model.tableName]);
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
        })),
    );

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
  stability: 'high',
  timeout: 60 * 1000,
});
