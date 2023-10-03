import knexMZ from 'services/knex/knexMZ';
import { MZ_SINK_PREFIX, MZ_SINK_KAFKA_ERRORS_TABLE } from 'consts/mz';
import showMzSystemRows from 'utils/db/showMzSystemRows';

export default async function deleteMZSinks() {
  const startTime = performance.now();
  printDebug('Deleting Materialize sinks', 'highlight');
  try {
    const sinks = await showMzSystemRows(`SHOW SINKS WHERE name LIKE '${MZ_SINK_PREFIX}%'`);
    for (const sink of sinks) {
      await knexMZ.raw('DROP SINK IF EXISTS ??', [sink])
        .timeout(10 * 1000);
    }

    try {
      await knexMZ.raw(`DELETE FROM ${MZ_SINK_KAFKA_ERRORS_TABLE}`)
        .timeout(10 * 1000);
    } catch (err) {
      if (!(err instanceof Error) || !err.message.includes('unknown catalog item')) {
        throw err;
      }
    }
  } catch (err) {
    if (err instanceof Error && (
      TS.getProp(err, 'code') === 'ECONNREFUSED'
        || err.message.includes('Timeout acquiring a connection')
        || err.message.includes('Connection terminated unexpectedly')
    )) {
      printDebug(err, 'warn');
    } else if (err instanceof Error) {
      throw getErr(err, { ctx: 'deleteMZSinks' });
    } else {
      throw err;
    }
  }

  printDebug(
    `Deleted sinks after ${Math.round((performance.now() - startTime) / 100) / 10}s`,
    'success',
  );
}
