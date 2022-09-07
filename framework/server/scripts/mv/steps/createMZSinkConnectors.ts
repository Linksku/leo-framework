import knexRR from 'services/knex/knexRR';
import MaterializedViewModels from 'services/model/allMaterializedViewModels';
import { getDateProps } from 'utils/models/dateSchemaHelpers';
import createMZSinkConnector from '../helpers/createMZSinkConnector';
import verifyCreatedTables from '../helpers/verifyCreatedTables';

export default async function createMZSinkConnectors() {
  printDebug('Creating Kafka sink connectors', 'highlight');
  for (const model of MaterializedViewModels) {
    const replicaTable = model.getReplicaTable();
    if (replicaTable === null) {
      continue;
    }
    const timestampProps = getDateProps(model.getSchema());

    await createMZSinkConnector({
      name: model.type,
      replicaTable,
      primaryKey: model.primaryIndex,
      timestampProps,
    });
  }

  await verifyCreatedTables(
    {
      host: process.env.PG_RR_HOST,
      port: TS.parseIntOrNull(process.env.PG_RR_PORT) ?? undefined,
      user: process.env.PG_RR_USER,
      password: process.env.PG_RR_PASS,
      database: process.env.PG_RR_DB,
    },
    knexRR,
    MaterializedViewModels.filter(model => model.getReplicaTable() !== null),
  );
}
