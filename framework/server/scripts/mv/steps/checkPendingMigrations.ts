import { getMigrationState } from 'scripts/migrate/helpers/migrationState';
import { getAllMigrations } from 'scripts/migrate/helpers/migrationFiles';
import EntityModels from 'core/models/allEntityModels';
import throttledPromiseAll from 'utils/throttledPromiseAll';

export default async function checkPendingMigrations() {
  const migrationState = await getMigrationState();
  const allMigrations = getAllMigrations();
  const pendingMigrations = allMigrations.filter(
    filename => filename > migrationState.lastMigration,
  );
  if (pendingMigrations.length) {
    throw getErr('checkPendingMigrations: pending migrations', {
      pendingMigrations,
    });
  }

  await throttledPromiseAll(5, EntityModels, async Entity => {
    const rows = await entityQuery(Entity, 'bt')
      .select(raw('1'))
      .limit(1);
    if (!rows.length) {
      throw getErr('checkPendingMigrations: empty entity table', {
        entity: Entity.name,
      });
    }
  });
}
