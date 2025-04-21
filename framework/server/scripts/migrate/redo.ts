import pgdump from 'scripts/db/pgdump';
import syncMVsAfterMigration from 'scripts/syncMVsAfterMigration';
import { getMigrationState } from './helpers/migrationState';
import { getMigration } from './helpers/migrationFiles';

export default async function migrationRedo() {
  const { rollback } = await getMigrationState();
  if (!rollback) {
    return;
  }
  await pgdump();

  const filesRan: string[] = [];
  let hadError = false;
  for (const file of rollback.files) {
    const migration = await getMigration(file);
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
    for (const file of rollback.files.slice().reverse()) {
      const migration = await getMigration(file);
      const type = rollback.type === 'up' ? 'down' : 'up';
      try {
        printDebug(`Running ${file}.${type}`, 'info');
        await migration[type]?.();
      } catch (err) {
        console.log(err);
        hadError = true;
        break;
      }
    }
  }

  if (filesRan.length && !hadError) {
    await syncMVsAfterMigration();
  }

  printDebug(`Reran ${filesRan.length} migrations`, 'success');
}
