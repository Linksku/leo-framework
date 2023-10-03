import { getMigrationState, updateMigrationState } from './helpers/migrationState';
import { getMigration, getPrevMigration } from './helpers/migrationFiles';
import syncMVsAfterMigration from './helpers/syncMVsAfterMigration';

export default async function migrationRollback() {
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

  if (TS.notEmpty(filesRan)) {
    await updateMigrationState(
      rollback.type === 'up'
        ? filesRan.at(-1)
        : getPrevMigration(filesRan.at(-1)),
      {
        type: rollback.type === 'up' ? 'down' : 'up',
        files: filesRan.reverse(),
      },
    );

    if (!hadError) {
      await syncMVsAfterMigration();
    }
  }

  printDebug(`Rolled back ${filesRan.length} migrations`, 'success');
}
