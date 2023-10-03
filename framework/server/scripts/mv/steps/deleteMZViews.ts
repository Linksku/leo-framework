import knexMZ from 'services/knex/knexMZ';
import showMzSystemRows from 'utils/db/showMzSystemRows';

export default async function deleteMZViews() {
  const startTime = performance.now();
  printDebug('Deleting Materialize views', 'highlight');
  try {
    const views = await showMzSystemRows('SHOW VIEWS');
    for (const view of views) {
      await knexMZ.raw('DROP VIEW IF EXISTS ?? CASCADE', [view])
        .timeout(10 * 1000);
    }
  } catch (err) {
    if (err instanceof Error && (
      TS.getProp(err, 'code') === 'ECONNREFUSED'
        || err.message.includes('Timeout acquiring a connection')
        || err.message.includes('Connection terminated unexpectedly')
    )) {
      printDebug(err, 'warn');
    } else if (err instanceof Error) {
      throw getErr(err, { ctx: 'deleteMZViews' });
    } else {
      throw err;
    }
  }

  printDebug(
    `Deleted views after ${Math.round((performance.now() - startTime) / 100) / 10}s`,
    'success',
  );
}
