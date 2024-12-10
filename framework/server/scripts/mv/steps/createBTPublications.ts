import throttledPromiseAll from 'utils/throttledPromiseAll';
import EntityModels from 'core/models/allEntityModels';
import knexBT from 'services/knex/knexBT';
import {
  BT_PUB_UPDATEABLE,
  BT_PUB_INSERT_ONLY,
  BT_PUB_ALL_TABLES,
  DBZ_FOR_UPDATEABLE,
  DBZ_FOR_INSERT_ONLY,
  BT_REPLICA_IDENTITY_FOR_DBZ,
  BT_REPLICA_IDENTITY_FOR_MZ,
  MZ_ENABLE_SKIP_COLUMNS,
  DBZ_ENABLE_SKIP_COLUMNS,
} from 'consts/mz';
import fetchBTPublications from '../helpers/fetchBTPublications';

function getPublicationTables(models: EntityClass[]) {
  return models.map(Model => {
    const usesDbz = Model.useInsertOnlyPublication
      ? DBZ_FOR_INSERT_ONLY
      : DBZ_FOR_UPDATEABLE;
    if (!Model.skipColumnsForMZ.length
      || (usesDbz ? !DBZ_ENABLE_SKIP_COLUMNS : !MZ_ENABLE_SKIP_COLUMNS)) {
      return `"${Model.tableName}"`;
    }

    // Note: this doesn't work with MZ's PG CDC.
    // With this enabled, PG disallows updates and MZ breaks after inserts.
    const columnsForMZ = Object.keys(Model.schema)
      .filter(col => !Model.skipColumnsForMZ.includes(col));
    return `"${Model.tableName}" (${columnsForMZ.map(col => `"${col}"`).join(',')})`;
  });
}

export default async function createBTPublications() {
  const startTime = performance.now();
  const updateableModels = EntityModels
    .filter(Model => !Model.useInsertOnlyPublication);
  const insertOnlyModels = EntityModels
    .filter(Model => Model.useInsertOnlyPublication);

  await throttledPromiseAll(5, EntityModels, async Model => {
    const usesDbz = Model.useInsertOnlyPublication
      ? DBZ_FOR_INSERT_ONLY
      : DBZ_FOR_UPDATEABLE;
    const rows = await knexBT<{ relreplident: string }>('pg_class')
      .select('relreplident')
      .where('oid', raw(`'"${Model.tableName}"'::regclass`));
    const expectedReplicaIdentity: 'DEFAULT' | 'FULL' = usesDbz
      ? BT_REPLICA_IDENTITY_FOR_DBZ
      : BT_REPLICA_IDENTITY_FOR_MZ;
    const expectedReplicaIdentityChar = expectedReplicaIdentity === 'DEFAULT' ? 'd' : 'f';
    if (!rows.length || rows[0].relreplident !== expectedReplicaIdentityChar) {
      await knexBT.raw(`
        ALTER TABLE "${Model.tableName}"
        REPLICA IDENTITY ${expectedReplicaIdentity}
      `);
    }
  });
  const pubnames = await fetchBTPublications();

  if ((DBZ_FOR_INSERT_ONLY || DBZ_FOR_UPDATEABLE)
    && updateableModels.length && !pubnames.includes(BT_PUB_UPDATEABLE)) {
    printDebug('Creating updateable tables publication', 'highlight');
    await knexBT.raw(`
      CREATE PUBLICATION "${BT_PUB_UPDATEABLE}"
      FOR TABLE ${getPublicationTables(updateableModels).join(',')}
    `);
  }

  /* for (const Model of EntityModels) {
    await knexBT.raw(`
      CREATE PUBLICATION "${BT_PUB_MODEL_PREFIX}${Model.tableName.toLowerCase()}"
      FOR TABLE "${Model.tableName}"
    `);
  } */

  if ((DBZ_FOR_INSERT_ONLY || DBZ_FOR_UPDATEABLE)
    && insertOnlyModels.length && !pubnames.includes(BT_PUB_INSERT_ONLY)) {
    printDebug('Creating insert-only publication', 'highlight');
    await knexBT.raw(`
      CREATE PUBLICATION "${BT_PUB_INSERT_ONLY}"
      FOR TABLE ${getPublicationTables(insertOnlyModels).join(',')}
      WITH (
        publish = 'insert'
      )
    `);
  }

  if (EntityModels.length && !pubnames.includes(BT_PUB_ALL_TABLES)) {
    printDebug('Creating replica publication', 'highlight');
    await knexBT.raw(`
      CREATE PUBLICATION "${BT_PUB_ALL_TABLES}"
      FOR TABLE ${EntityModels.map(Model => `"${Model.tableName}"`).join(',')}
    `);
  }

  printDebug(
    `Created publications after ${Math.round((performance.now() - startTime) / 100) / 10}s`,
    'success',
  );
}
