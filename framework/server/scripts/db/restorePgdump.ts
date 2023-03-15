import knexBT from 'services/knex/knexBT';
import knexRR from 'services/knex/knexRR';
import exec from 'utils/exec';
import { getAllMigrations } from 'scripts/migrate/helpers/migrationFiles';
import { updateMigrationState } from 'scripts/migrate/helpers/migrationState';
import { PG_BT_HOST, PG_RR_HOST } from 'consts/infra';

export default async function pgdumpRestore() {
  try {
    await knexBT.raw('SELECT 1 FROM notif LIMIT 1');
    printDebug('BT tables already exist', 'info');
  } catch {
    printDebug('Restoring BT', 'info');
    await exec(
      `su - ${process.env.PG_BT_SUPERUSER} -c "cd \`pwd\`; psql -d ${process.env.PG_BT_DB} -f app/pgdumpBT.sql --username ${process.env.PG_BT_USER} --host=${PG_BT_HOST} -v ON_ERROR_STOP=1"`,
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
      `su - ${process.env.PG_RR_SUPERUSER} -c "cd \`pwd\`; psql -d ${process.env.PG_RR_DB} -f app/pgdumpRR.sql --username ${process.env.PG_RR_USER} --host=${PG_RR_HOST} -v ON_ERROR_STOP=1"`,
      {
        env: {
          PGPASSWORD: process.env.PG_RR_PASS,
        } as unknown as NodeJS.ProcessEnv,
      },
    );
  }

  const allMigrations = getAllMigrations();
  const lastMigration = TS.last(allMigrations);
  if (lastMigration) {
    await updateMigrationState(lastMigration);
  }
}
