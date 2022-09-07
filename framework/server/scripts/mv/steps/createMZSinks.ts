import MaterializedViewModels from 'services/model/allMaterializedViewModels';
import createMZSink from '../helpers/createMZSink';

export default async function createMZSinks() {
  printDebug('Creating Materialize sinks', 'highlight');
  for (const model of MaterializedViewModels) {
    if (model.getReplicaTable() === null) {
      continue;
    }
    await createMZSink({
      name: model.type,
      primaryKey: Array.isArray(model.primaryIndex) ? model.primaryIndex : [model.primaryIndex],
    });
  }
}