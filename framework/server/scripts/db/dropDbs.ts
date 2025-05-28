import prompt from 'utils/prompt';
import knexBT from 'services/knex/knexBT';
import knexRR from 'services/knex/knexRR';
import { PG_BT_SCHEMA, PG_RR_SCHEMA } from 'consts/infra';
import { HAS_MVS } from 'config/__generated__/consts';

export default async function dropDbs() {
  const ans = await prompt('Delete BT and RR databases?');
  if (ans.toLowerCase() !== 'y') {
    return;
  }

  await Promise.all([
    HAS_MVS
      ? knexRR.raw(`DROP SCHEMA IF EXISTS ${PG_RR_SCHEMA} CASCADE`)
      : null,
    knexBT.raw(`DROP SCHEMA IF EXISTS ${PG_BT_SCHEMA} CASCADE`),
  ]);
}
