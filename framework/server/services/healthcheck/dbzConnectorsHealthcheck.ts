import {
  DBZ_FOR_UPDATEABLE,
  DBZ_FOR_INSERT_ONLY,
  DBZ_CONNECTOR_UPDATEABLE,
  DBZ_CONNECTOR_INSERT_ONLY,
} from 'consts/mz';
import fetchKafkaConnectors from 'utils/infra/fetchKafkaConnectors';
import EntityModels from 'core/models/allEntityModels';
import { HAS_MVS } from 'config/__generated__/consts';
import { addHealthcheck } from './HealthcheckManager';

addHealthcheck('dbzConnectors', {
  disabled: (!DBZ_FOR_UPDATEABLE && !DBZ_FOR_INSERT_ONLY) || !HAS_MVS,
  run: async function dbzConnectorsHealthcheck() {
    const {
      updateableConnectors,
      insertOnlyConnectors,
    } = await promiseObj({
      updateableConnectors: DBZ_FOR_UPDATEABLE
        ? fetchKafkaConnectors(DBZ_CONNECTOR_UPDATEABLE, 'status')
        : null,
      insertOnlyConnectors: DBZ_FOR_INSERT_ONLY
        ? fetchKafkaConnectors(DBZ_CONNECTOR_INSERT_ONLY, 'status')
        : null,
    });

    const updateableModels = EntityModels
      .filter(model => !model.useInsertOnlyPublication);
    if (DBZ_FOR_UPDATEABLE && updateableConnectors && updateableModels.length) {
      if (!updateableConnectors.length) {
        throw new Error('dbzConnectorsHealthcheck: no updateable tables DBZ connector');
      }
      if (updateableConnectors.length > 1) {
        throw new Error('dbzConnectorsHealthcheck: more than 1 updateable tables DBZ connectors');
      }
      if (updateableConnectors[0].status.connector.state !== 'RUNNING') {
        throw new Error('dbzConnectorsHealthcheck: updateable tables DBZ connector not running');
      }
      const failedTask = updateableConnectors[0].status.tasks.find(t => t.state === 'FAILED');
      if (failedTask) {
        const traceLines = failedTask.trace.split('\n');
        throw getErr('dbzConnectorsHealthcheck: updateable tables DBZ connector task failed', {
          taskError: [
            traceLines[0],
            ...traceLines.slice(1).filter(line => line.startsWith('Caused by:')),
          ].join('\n'),
        });
      }
    }

    const insertOnlyModels = EntityModels
      .filter(model => model.useInsertOnlyPublication);
    if (DBZ_FOR_INSERT_ONLY && insertOnlyConnectors && insertOnlyModels.length) {
      if (!insertOnlyConnectors.length) {
        throw new Error('dbzConnectorsHealthcheck: no insert-only DBZ connector');
      }
      if (insertOnlyConnectors.length > 1) {
        throw new Error('dbzConnectorsHealthcheck: more than 1 insert-only DBZ connector');
      }
      if (insertOnlyConnectors[0].status.connector.state !== 'RUNNING') {
        throw new Error('dbzConnectorsHealthcheck: insert-only DBZ connector not running');
      }
      const failedTask = insertOnlyConnectors[0].status.tasks.find(t => t.state === 'FAILED');
      if (failedTask) {
        throw getErr('dbzConnectorsHealthcheck: insert-only DBZ connector task failed', {
          taskError: failedTask.trace.split('\n')[0],
        });
      }
    }
  },
  resourceUsage: 'med',
  usesResource: 'kafka',
  stability: 'med',
  timeout: 10 * 1000,
});
