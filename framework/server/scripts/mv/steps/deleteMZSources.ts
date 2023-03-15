import knexMZ from 'services/knex/knexMZ';
import showMzSystemRows from 'utils/db/showMzSystemRows';

export default async function deleteMZSources() {
  const startTime = performance.now();
  printDebug('Deleting MZ sources', 'highlight');
  try {
    const sources = await showMzSystemRows('SHOW SOURCES');
    for (const source of sources) {
      await knexMZ.raw('DROP SOURCE IF EXISTS ?? CASCADE', [source]);
    }
  } catch (err) {
    if (err instanceof Error && (
      TS.getProp(err, 'code') === 'ECONNREFUSED'
        || err.message.includes('Timeout acquiring a connection')
        || err.message.includes('Connection terminated unexpectedly')
    )) {
      printDebug(err, 'warn');
    } else if (err instanceof Error) {
      throw getErr(err, { ctx: 'deleteMZSources' });
    } else {
      throw err;
    }
  }

  printDebug(`Deleted MZ sources after ${Math.round((performance.now() - startTime) / 100) / 10}s`, 'success');
}
