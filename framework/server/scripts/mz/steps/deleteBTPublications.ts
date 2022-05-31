import knexBT from 'services/knex/knexBT';
import { BT_PUB_ALL_TABLES, BT_PUB_INSERT_ONLY, BT_PUB_PREFIX } from 'consts/mz';

export default async function deleteBTPublications() {
  // todo: mid/mid don't recreate WAL if nothing changed
  printDebug(`Deleting publications`, 'highlight');
  const { rows } = await knexBT.raw(`
    SELECT pubname FROM pg_publication
    WHERE pubname = '${BT_PUB_ALL_TABLES}'
      OR pubname = '${BT_PUB_INSERT_ONLY}'
      OR pubname LIKE '${BT_PUB_PREFIX}%'
  `);
  for (const row of rows) {
    await knexBT.raw(`DROP PUBLICATION IF EXISTS ??`, [row.pubname]);
  }
}
