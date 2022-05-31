import childProcess from 'child_process';
import { promisify } from 'util';

import knexBT from 'services/knex/knexBT';
import knexRR from 'services/knex/knexRR';

export default async function pgdumpRestore() {
  try {
    await knexBT.raw(`SELECT 1 FROM user LIMIT 1`);
  } catch {
    printDebug('Restoring BT', 'info');
    await promisify(childProcess.exec)(
      `psql -d ${process.env.PG_BT_DB} -f app/pgdumpBT.sql --username ${process.env.PG_BT_USER} --host=${process.env.PG_BT_HOST} -v ON_ERROR_STOP=1`,
      {
        env: {
          PGPASSWORD: process.env.PG_BT_PASS,
        } as unknown as NodeJS.ProcessEnv,
      },
    );
  }

  try {
    await knexRR.raw(`SELECT 1 FROM user LIMIT 1`);
  } catch {
    printDebug('Restoring RR', 'info');
    await promisify(childProcess.exec)(
      `psql -d ${process.env.PG_RR_DB} -f app/pgdumpRR.sql --username ${process.env.PG_RR_USER} --host=${process.env.PG_RR_HOST} -v ON_ERROR_STOP=1`,
      {
        env: {
          PGPASSWORD: process.env.PG_RR_PASS,
        } as unknown as NodeJS.ProcessEnv,
      },
    );
  }
}
