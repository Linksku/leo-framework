import EntityModels from 'services/model/allEntityModels';
import createMZDBZSource from '../helpers/createMZDBZSource';
import createDBZAllTablesConnector from './createDBZAllTablesConnector';
import createDBZInsertOnlyConnector from './createDBZInsertOnlyConnector';

export default async function createMZViewsFromDebezium() {
  printDebug('Creating DBZ connectors', 'highlight');
  await createDBZAllTablesConnector();
  await createDBZInsertOnlyConnector();

  printDebug('Creating DBZ sources/views', 'highlight');
  await createMZDBZSource(EntityModels, false);

  const modelsWithInsertOnly = EntityModels
    .filter(model => model.withInsertOnlyPublication);
  if (modelsWithInsertOnly.length) {
    await createMZDBZSource(modelsWithInsertOnly, true);
  }
}
