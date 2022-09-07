import { promises as fs } from 'fs';
import path from 'path';

type MigrationState = {
  lastMigration: string,
  rollback?: {
    type: 'up' | 'down',
    files: string[],
  },
};

export async function getMigrationState(): Promise<MigrationState> {
  try {
    const lastMigrateTimeFile = await fs.readFile(path.resolve('./app/server/.migrationState.json'));
    const data = JSON.parse(lastMigrateTimeFile.toString().trim());
    return TS.assertType<MigrationState>(
      val => val && typeof val.lastMigration === 'string' && val.lastMigration.endsWith('.ts'),
      data,
    );
  } catch {}
  return {
    lastMigration: '1000-00-00_000000.ts',
  };
}

export async function updateMigrationState(lastMigration: string, rollback?: MigrationState['rollback']) {
  await fs.writeFile(
    path.resolve('./app/server/.migrationState.json'),
    `${JSON.stringify({
      lastMigration,
      rollback,
    }, null, 2)}\n`,
  );
}
