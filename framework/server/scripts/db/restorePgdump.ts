import knexBT from 'services/knex/knexBT';
import knexRR from 'services/knex/knexRR';
import exec from 'utils/exec';
import { getAllMigrations } from 'scripts/migrate/helpers/migrationFiles';
import { updateMigrationState } from 'scripts/migrate/helpers/migrationState';
import {
  PG_BT_HOST,
  PG_BT_DB,
  PG_RR_HOST,
  PG_RR_DB,
} from 'consts/infra';

export default async function restorePgdump() {
  try {
    await knexBT.raw('SELECT 1 FROM "userAuth" LIMIT 1');
    printDebug('BT tables already exist', 'info');
  } catch {
    printDebug('Restoring BT', 'info');
    // Note: might have permission issues, try "su - ${process.env.PG_BT_SUPERUSER} -c"
    await exec(
      `psql -d ${PG_BT_DB} -f app/pgdumpBT.sql \
        --username ${process.env.PG_BT_USER} --host=${PG_BT_HOST} \
        -v ON_ERROR_STOP=1 --quiet`,
      {
        env: {
          PGPASSWORD: process.env.PG_BT_PASS,
        } as unknown as NodeJS.ProcessEnv,
        stream: true,
      },
    );
  }

  try {
    await knexRR.raw('SELECT 1 FROM "userAuth" LIMIT 1');
    printDebug('RR tables already exist', 'info');
  } catch {
    printDebug('Restoring RR', 'info');
    await exec(
      `psql -d ${PG_RR_DB} -f app/pgdumpRR.sql \
        --username ${process.env.PG_RR_USER} --host=${PG_RR_HOST} \
        -v ON_ERROR_STOP=1 --quiet`,
      {
        env: {
          PGPASSWORD: process.env.PG_RR_PASS,
        } as unknown as NodeJS.ProcessEnv,
        stream: true,
      },
    );
  }

  const allMigrations = getAllMigrations();
  const lastMigration = allMigrations.at(-1);
  if (lastMigration) {
    await updateMigrationState(lastMigration);
  }
}
