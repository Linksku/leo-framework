import EntityModels from 'services/model/allEntityModels';
import createMZDBZSource from '../helpers/createMZDBZSource';

export default async function createMZViewsFromDebezium() {
  printDebug('Creating DBZ sources/views', 'highlight');

  await createMZDBZSource(EntityModels, false);

  const modelsWithInsertOnly = EntityModels
    .filter(model => model.withInsertOnlyPublication);
  if (modelsWithInsertOnly.length) {
    await createMZDBZSource(modelsWithInsertOnly, true);
  }
}
