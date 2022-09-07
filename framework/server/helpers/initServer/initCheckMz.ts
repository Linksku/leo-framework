import cluster from 'cluster';

import knexMZ from 'services/knex/knexMZ';
import fetchKafkaConnectors from 'utils/infra/fetchKafkaConnectors';
import { MZ_SINK_CONNECTOR_PREFIX } from 'consts/mz';

async function checkMZRunning() {
  let result: any;
  try {
    result = await knexMZ.raw('SHOW VIEWS WHERE name = \'userMV\'');
  } catch {
    throw new Error('checkMZRunning: MZ not available.');
  }
  if (!result.rows.length) {
    throw new Error('checkMZRunning: views missing.');
  }
}

async function checkKafkaConnectRunning() {
  const connectors = await fetchKafkaConnectors(MZ_SINK_CONNECTOR_PREFIX);
  if (!connectors.length) {
    throw new Error('checkKafkaConnectRunning: Kafka is up, but no Connectors found.');
  }
}

export default async function initCheckMz() {
  if (!cluster.isMaster) {
    return;
  }

  await Promise.all([
    checkMZRunning(),
    checkKafkaConnectRunning(),
  ]);
}
