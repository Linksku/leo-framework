import knexBT from 'services/knex/knexBT';
import {
  BT_PUB_UPDATEABLE,
  BT_PUB_INSERT_ONLY,
  BT_PUB_ALL_TABLES,
  BT_PUB_MODEL_PREFIX,
} from 'consts/mz';

export default async function fetchBTPublications() {
  const rows = await knexBT('pg_publication')
    .select('pubname')
    .where(builder => builder
      .whereIn('pubname', [BT_PUB_UPDATEABLE, BT_PUB_INSERT_ONLY, BT_PUB_ALL_TABLES])
      .orWhereLike('pubname', `${BT_PUB_MODEL_PREFIX}%`));
  return rows.map(r => r.pubname);
}
