import type { Arguments } from 'yargs';

import type { MaterializedViewClass } from 'services/model/MaterializedView';
import isModelType from 'utils/models/isModelType';
import MaterializedViews from 'services/model/allMaterializedViewModels';

export default function getModelDependents(args?: Arguments) {
  let arg = args?._[2];
  if (!arg || typeof arg !== 'string') {
    throw new Error('getModelDependents: modelType required');
  }

  arg = arg[0].toLowerCase() + arg.slice(1);
  if (!isModelType(arg)) {
    throw new Error('getModelDependents: modelType required');
  }
  const modelType = arg;
  const initialModel = getModelClass(modelType);

  const foundModels = new Set([initialModel]);
  while (foundModels.size < 50) {
    const startingSize = foundModels.size;
    for (const Model of MaterializedViews) {
      for (const dep of foundModels) {
        if (Model.MVQueryDeps.includes(dep)) {
          foundModels.add(Model);
          break;
        }
      }
    }
    if (foundModels.size === startingSize) {
      break;
    }
  }
  foundModels.delete(initialModel);

  const dependents = foundModels as Set<MaterializedViewClass>;
  const directDependents = Array.from(dependents).filter(
    m => m.MVQueryDeps.includes(initialModel),
  );
  console.log(`${modelType} has ${directDependents.length} direct dependents:
${Array.from(directDependents).map(m => m.type).join('\n')}

${modelType} has ${dependents.size} indirect dependents:
${Array.from(dependents).filter(m => !directDependents.includes(m)).map(m => m.type).join('\n')}`);
}
