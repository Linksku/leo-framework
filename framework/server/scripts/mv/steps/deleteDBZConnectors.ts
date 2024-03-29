import deleteKafkaConnector from 'utils/infra/deleteKafkaConnector';
import { DBZ_TOPIC_UPDATEABLE_PREFIX, DBZ_TOPIC_INSERT_ONLY_PREFIX, DBZ_CONNECTOR_PREFIX } from 'consts/mz';
import fetchKafkaConnectors from 'utils/infra/fetchKafkaConnectors';
import deleteTopicsAndSchema from 'utils/infra/deleteTopicsAndSchema';
import { verifyUpdateableConnector, verifyInsertOnlyConnector } from '../helpers/verifyDBZKafkaConnectors';

// Possible error: Failed to remove connector configuration from Kafka
//   at org.apache.kafka.connect.util.ConvertingFutureCallback.get(ConvertingFutureCallback.java:106)
async function _deleteUpdateableDBZConnector(forceDeleteDBZConnectors: boolean) {
  const { isValid, connector } = await verifyUpdateableConnector();

  if ((forceDeleteDBZConnectors || !isValid) && connector) {
    printDebug('Deleting DBZ updateable tables connectors', 'highlight');
    await deleteKafkaConnector(connector.name);
    await deleteTopicsAndSchema(DBZ_TOPIC_UPDATEABLE_PREFIX);
  }
}

async function _deleteInsertOnlyDBZConnector(forceDeleteDBZConnectors: boolean) {
  const { isValid, connector } = await verifyInsertOnlyConnector();

  if ((forceDeleteDBZConnectors || !isValid) && connector) {
    printDebug('Deleting DBZ insert-only connectors', 'highlight');
    await deleteKafkaConnector(connector.name);
    await deleteTopicsAndSchema(DBZ_TOPIC_INSERT_ONLY_PREFIX);
  }
}

export default async function deleteDBZConnectors(forceDeleteDBZConnectors: boolean) {
  const startTime = performance.now();
  await Promise.all([
    _deleteUpdateableDBZConnector(forceDeleteDBZConnectors),
    _deleteInsertOnlyDBZConnector(forceDeleteDBZConnectors),
  ]);

  if (forceDeleteDBZConnectors) {
    const connectors = await fetchKafkaConnectors(DBZ_CONNECTOR_PREFIX);
    if (connectors.length) {
      throw getErr(
        'deleteDBZConnectors: DBZ connectors remaining',
        { connectors },
      );
    }
  }

  printDebug(
    `Deleted DBZ connectors after ${Math.round((performance.now() - startTime) / 100) / 10}s`,
    'success',
  );
}
