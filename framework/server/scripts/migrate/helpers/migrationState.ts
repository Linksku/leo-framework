import knexBT from 'services/knex/knexBT';

type MigrationState = {
  lastMigration: string,
  rollback?: {
    type: 'up' | 'down',
    files: string[],
  },
};

// todo: low/mid combine __migration__ and mzTest into a "global config" table
export async function getMigrationState(): Promise<MigrationState> {
  // todo: low/mid specify shared types for each table
  const data = await knexBT('__migration__')
    .select('*')
    .first();
  try {
    return TS.assertType<MigrationState>(
      data,
      val => TS.isObj(val)
        && typeof val.lastMigration === 'string'
        && val.lastMigration.endsWith('.ts'),
    );
  } catch {}
  return {
    lastMigration: '1000-00-00_000000.ts',
  };
}

export async function updateMigrationState(
  lastMigration: string,
  rollback?: MigrationState['rollback'],
) {
  const update = {
    lastMigration,
    rollback: rollback ?? {
      type: 'up',
      files: [],
    },
  } satisfies MigrationState;

  if (await knexBT('__migration__').select('*').first()) {
    await knexBT('__migration__')
      .update(update);
  } else {
    await knexBT('__migration__')
      .insert(update);
  }
}
