import get from 'lodash/get';

import { MZ_SINK_CONNECTOR_PREFIX } from 'consts/mz';
import MaterializedViewModels from 'services/model/allMaterializedViewModels';
import fetchKafkaConnectors from 'utils/infra/fetchKafkaConnectors';
import { addHealthcheck } from './HealthcheckManager';

addHealthcheck('mzSinkConnectors', {
  cb: async function mzSinkConnectorsHealthcheck() {
    const connectors = await fetchKafkaConnectors(MZ_SINK_CONNECTOR_PREFIX, 'status');
    if (connectors.length === 0) {
      throw new Error('mzSinkConnectorsHealthcheck: no connectors');
    }

    const modelsWithSinks = MaterializedViewModels
      .filter(model => model.getReplicaTable())
      .map(model => model.type);
    const missingModels = modelsWithSinks
      .filter(model => !connectors.some(c => c.name.startsWith(`${MZ_SINK_CONNECTOR_PREFIX}${model}_`)));

    if (missingModels.length) {
      throw getErr('mzSinkConnectorsHealthcheck: missing connectors', {
        numMissing: missingModels.length,
        missingModels,
      });
    }
    if (connectors.length !== modelsWithSinks.length) {
      throw new Error('mzSinkConnectorsHealthcheck: wrong number of connectors');
    }

    const notRunning = connectors.filter(c => get(c, 'status.connector.state') !== 'RUNNING');
    if (notRunning.length) {
      throw getErr('mzSinkConnectorsHealthcheck: connector(s) not running', {
        connectors: notRunning.map(c => `${c.name}: ${get(c, 'status.connector.state')}`),
      });
    }
  },
  resourceUsage: 'mid',
  stability: 'mid',
  timeout: 10 * 1000,
});
