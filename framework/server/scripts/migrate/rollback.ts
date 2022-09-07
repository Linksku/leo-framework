import pgdump from 'scripts/db/pgdump';
import { getMigrationState, updateMigrationState } from './helpers/migrationState';
import { getMigration, getPrevMigration } from './helpers/migrationFiles';

export default async function migrationRollback() {
  const { rollback } = await getMigrationState();
  if (!rollback) {
    return;
  }

  const filesRan: string[] = [];
  for (const file of rollback.files) {
    const migration = await getMigration(file);
    try {
      printDebug(`Running ${file}.${rollback.type}`, 'info');
      await migration[rollback.type]?.();
    } catch (err) {
      console.log(err);
      break;
    }
    filesRan.push(file);
  }

  if (filesRan.length) {
    await updateMigrationState(
      rollback.type === 'up'
        ? filesRan[filesRan.length - 1]
        : await getPrevMigration(filesRan[filesRan.length - 1]),
      {
        type: rollback.type === 'up' ? 'down' : 'up',
        files: filesRan.reverse(),
      },
    );
    await pgdump();
  }

  printDebug(`Rolled back ${filesRan.length} migrations`, 'success');
}
