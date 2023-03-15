import prompt from 'utils/prompt';
import knexBT from 'services/knex/knexBT';
import knexRR from 'services/knex/knexRR';
import { PG_BT_SCHEMA, PG_RR_SCHEMA } from 'consts/infra';

export default async function resetDb() {
  const ans = await prompt('Delete BT and RR databases?');
  if (ans.toLowerCase() !== 'y') {
    await ErrorLogger.flushAndExit(0);
  }

  await Promise.all([
    knexRR.raw(`DROP SCHEMA ${PG_RR_SCHEMA} CASCADE`),
    knexBT.raw(`DROP SCHEMA ${PG_BT_SCHEMA} CASCADE`),
  ]);
  await Promise.all([
    knexRR.raw(`CREATE SCHEMA ${PG_RR_SCHEMA}`),
    knexBT.raw(`CREATE SCHEMA ${PG_BT_SCHEMA}`),
  ]);
}
