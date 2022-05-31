import knexMZ from 'services/knex/knexMZ';
import deleteKafkaTopic from 'utils/infra/deleteKafkaTopic';
import { MZ_SINK_PREFIX, MZ_SINK_TOPIC_PREFIX } from 'consts/mz';

export default async function deleteMZSinks() {
  printDebug(`Deleting Materialize sinks`, 'highlight');
  try {
    const results = await knexMZ.raw(`SHOW SINKS WHERE name LIKE '${MZ_SINK_PREFIX}%'`);
    for (const row of results.rows) {
      await knexMZ.raw(`DROP SINK IF EXISTS ??`, [row.name]);
    }
  } catch (err) {
    if (err instanceof Error && (
      TS.getProp(err, 'code') === 'ECONNREFUSED'
        || err.message.includes('Timeout acquiring a connection')
    )) {
      // pass
    } else {
      throw err;
    }
  }

  printDebug(`Deleting Kafka sink topics`, 'highlight');
  await deleteKafkaTopic(`${MZ_SINK_TOPIC_PREFIX}.*`);
}
