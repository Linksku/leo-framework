import prompt from 'utils/prompt';
import knexBT from 'services/knex/knexBT';
import knexRR from 'services/knex/knexRR';

export default async function resetDb() {
  const ans = await prompt('Delete BT and RR databases?');
  if (ans.toLowerCase() !== 'y') {
    process.exit(0);
  }

  await Promise.all([
    knexRR.raw(`drop schema ${process.env.PG_RR_SCHEMA} cascade`),
    knexBT.raw(`drop schema ${process.env.PG_BT_SCHEMA} cascade`),
  ]);
  await Promise.all([
    knexRR.raw(`create schema ${process.env.PG_RR_SCHEMA}`),
    knexBT.raw(`create schema ${process.env.PG_BT_SCHEMA}`),
  ]);
}
