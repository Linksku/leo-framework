import uniq from 'lodash/uniq.js';

import { DBZ_FOR_INSERT_ONLY, DBZ_FOR_UPDATEABLE } from 'consts/mz';
import MaterializedViewModels from 'services/model/allMaterializedViewModels';
import getModelRecursiveDeps from 'utils/models/getModelRecursiveDeps';

type ReturnType = {
  pg: EntityClass[],
  kafka: EntityClass[],
  all: ModelClass[],
};

let cached: ReturnType | null = null;

export default function getEntitiesForMZSources<T extends keyof ReturnType>(
  type: T,
): ReturnType[T] {
  if (!cached) {
    const entitiesWithMZSources = uniq(
      MaterializedViewModels
        .flatMap(Model => getModelRecursiveDeps(Model))
        .filter(Model => !Model.isMV),
    ) as EntityClass[];

    const pgEntities = entitiesWithMZSources.filter(
      Model => (!DBZ_FOR_UPDATEABLE && !Model.useInsertOnlyPublication)
        || (!DBZ_FOR_INSERT_ONLY && Model.useInsertOnlyPublication),
    );
    const dbzEntities = entitiesWithMZSources.filter(
      Model => (DBZ_FOR_UPDATEABLE && !Model.useInsertOnlyPublication)
        || (DBZ_FOR_INSERT_ONLY && Model.useInsertOnlyPublication),
    );
    cached = {
      pg: pgEntities,
      kafka: dbzEntities,
      all: [...pgEntities, ...dbzEntities],
    };
  }
  return cached[type];
}
