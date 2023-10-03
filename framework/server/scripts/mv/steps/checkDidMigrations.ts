import { getMigrationState } from 'scripts/migrate/helpers/migrationState';
import { getAllMigrations } from 'scripts/migrate/helpers/migrationFiles';

export default async function checkDidMigrations() {
  const migrationState = await getMigrationState();
  const allMigrations = getAllMigrations();
  const pendingMigrations = allMigrations.filter(
    filename => filename > migrationState.lastMigration,
  );
  if (pendingMigrations.length) {
    throw getErr('checkDidMigrations: pending migrations', {
      pendingMigrations,
    });
  }
}
