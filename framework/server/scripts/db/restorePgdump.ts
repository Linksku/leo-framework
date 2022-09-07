import knexBT from 'services/knex/knexBT';
import knexRR from 'services/knex/knexRR';
import exec from 'utils/exec';

export default async function pgdumpRestore() {
  try {
    await knexBT.raw('SELECT 1 FROM notif LIMIT 1');
    printDebug('BT tables already exist', 'info');
  } catch {
    printDebug('Restoring BT', 'info');
    await exec(
      `psql -d ${process.env.PG_BT_DB} -f app/pgdumpBT.sql --username ${process.env.PG_BT_USER} --host=${process.env.PG_BT_HOST} -v ON_ERROR_STOP=1`,
      {
        env: {
          PGPASSWORD: process.env.PG_BT_PASS,
        } as unknown as NodeJS.ProcessEnv,
      },
    );
  }

  try {
    await knexRR.raw('SELECT 1 FROM notif LIMIT 1');
    printDebug('RR tables already exist', 'info');
  } catch {
    printDebug('Restoring RR', 'info');
    await exec(
      `psql -d ${process.env.PG_RR_DB} -f app/pgdumpRR.sql --username ${process.env.PG_RR_USER} --host=${process.env.PG_RR_HOST} -v ON_ERROR_STOP=1`,
      {
        env: {
          PGPASSWORD: process.env.PG_RR_PASS,
        } as unknown as NodeJS.ProcessEnv,
      },
    );
  }
}
