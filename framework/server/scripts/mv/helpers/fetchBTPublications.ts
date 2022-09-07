import knexBT from 'services/knex/knexBT';
import { BT_PUB_ALL_TABLES, BT_PUB_INSERT_ONLY, BT_PUB_PREFIX } from 'consts/mz';

export default async function fetchBTPublications() {
  const rows = await knexBT('pg_publication')
    .select('pubname')
    .where(builder => builder.where('pubname', BT_PUB_ALL_TABLES)
      .orWhere('pubname', BT_PUB_INSERT_ONLY)
      .orWhereLike('pubname', `${BT_PUB_PREFIX}%`));
  return rows.map(r => r.pubname);
}
