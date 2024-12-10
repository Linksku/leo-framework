import type { MaterializedViewClass } from 'core/models/MaterializedView';
import MaterializedViews from 'core/models/allMaterializedViewModels';

export default function getModelDependents(Model: ModelClass) {
  const foundModels = new Set([Model]);
  while (foundModels.size < 50) {
    const startingSize = foundModels.size;
    for (const MV of MaterializedViews) {
      for (const dep of foundModels) {
        if (MV.MVQueryDeps.includes(dep)) {
          foundModels.add(MV);
          break;
        }
      }
    }
    if (foundModels.size === startingSize) {
      break;
    }
  }
  foundModels.delete(Model);

  return foundModels as Set<MaterializedViewClass>;
}
