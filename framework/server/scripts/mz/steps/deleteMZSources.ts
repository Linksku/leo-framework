import knexMZ from 'services/knex/knexMZ';
import deleteBTReplicationSlot from 'utils/infra/deleteBTReplicationSlot';
import { BT_SLOT_MZ_PREFIX } from 'consts/mz';

export default async function deleteMZSources() {
  printDebug(`Deleting MZ sources`, 'highlight');
  try {
    const result = await knexMZ.raw('SHOW SOURCES');
    for (const row of result.rows) {
      await knexMZ.raw(`DROP SOURCE IF EXISTS ?? CASCADE`, [row.name]);
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

  await deleteBTReplicationSlot(`${BT_SLOT_MZ_PREFIX}%`);
}
