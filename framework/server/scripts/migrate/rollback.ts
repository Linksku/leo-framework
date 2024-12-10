import pgdump from 'scripts/db/pgdump';
import syncMVsAfterMigration from 'scripts/syncMVsAfterMigration';
import { getMigrationState, updateMigrationState } from './helpers/migrationState';
import { getMigration, getPrevMigration } from './helpers/migrationFiles';

export default async function migrationRollback() {
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

  if (TS.notEmpty(filesRan)) {
    await updateMigrationState(
      rollback.type === 'up'
        ? filesRan.at(-1)
        : getPrevMigration(filesRan.at(-1)),
      {
        type: rollback.type === 'up' ? 'down' : 'up',
        files: filesRan.slice().reverse(),
      },
    );

    if (!hadError) {
      await syncMVsAfterMigration();
    }
  }

  printDebug(`Rolled back ${filesRan.length} migrations`, 'success');
}
