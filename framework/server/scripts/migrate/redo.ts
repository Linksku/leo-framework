import { getMigrationState } from './helpers/migrationState';
import { getMigration } from './helpers/migrationFiles';
import syncMVsAfterMigration from './helpers/syncMVsAfterMigration';

export default async function migrationRedo() {
  const { rollback } = await getMigrationState();
  if (!rollback) {
    return;
  }

  const filesRan: string[] = [];
  let hadError = false;
  for (const file of rollback.files) {
    const migration = getMigration(file);
    printDebug(`Running ${file}.${rollback.type}`, 'info');
    try {
      await migration[rollback.type]?.();
      filesRan.push(file);
    } catch (err) {
      console.log(err);
      hadError = true;
      break;
    }
  }

  if (!hadError) {
    for (const file of [...rollback.files].reverse()) {
      const migration = getMigration(file);
      const type = rollback.type === 'up' ? 'down' : 'up';
      try {
        printDebug(`Running ${file}.${type}`, 'info');
        await migration[type]?.();
      } catch (err) {
        console.log(err);
        break;
      }
    }
  }

  if (filesRan.length && !hadError) {
    await syncMVsAfterMigration();
  }

  printDebug(`Reran ${filesRan.length} migrations`, 'success');
}
