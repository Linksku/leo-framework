import uniq from 'lodash/uniq';

import MaterializedViewModels from 'services/model/allMaterializedViewModels';
import getModelRecursiveDeps from 'utils/models/getModelRecursiveDeps';

let cached: EntityType[] | null = null;

export default function getEntitiesWithMZSources() {
  if (!cached) {
    cached = uniq(
      MaterializedViewModels
        .flatMap(model => getModelRecursiveDeps(model))
        .filter(model => !model.isMV)
        .map(model => model.type as EntityType),
    );
  }
  return cached;
}
