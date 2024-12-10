import knexMZ from 'services/knex/knexMZ';
import showMzSystemRows from 'utils/db/showMzSystemRows';
import { MZ_SINK_KAFKA_ERRORS_TABLE } from 'consts/mz';

export default async function createMZErrorsTables() {
  const existingTables = new Set(await showMzSystemRows('SHOW TABLES'));

  if (!existingTables.has(MZ_SINK_KAFKA_ERRORS_TABLE)) {
    await knexMZ.schema.createTable(MZ_SINK_KAFKA_ERRORS_TABLE, builder => {
      builder.string('modelType').notNullable();
      builder.string('sinkId').notNullable();
      builder.integer('count').notNullable();
    });
  }

  printDebug('Created MZ errors table', 'success');
}
