import { getMigrationState } from 'scripts/migrate/helpers/migrationState';
import { getAllMigrations } from 'scripts/migrate/helpers/migrationFiles';

export default async function getPendingMigrations() {
  const migrationState = await getMigrationState();
  const allMigrations = await getAllMigrations();
  const pendingMigrations = allMigrations.filter(
    filename => filename > migrationState.lastMigration,
  );
  return pendingMigrations;
}
