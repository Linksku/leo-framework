import type { Arguments } from 'yargs';

import isModelType from 'utils/models/isModelType';
import getModelDependents from 'utils/models/getModelDependents';

export default function printModelDependents(args?: Arguments) {
  let arg = args?._[2];
  if (!arg || typeof arg !== 'string') {
    throw new Error('printModelDependents: modelType required');
  }

  arg = arg[0].toLowerCase() + arg.slice(1);
  if (!isModelType(arg)) {
    throw new Error('printModelDependents: modelType required');
  }
  const modelType = arg;

  const Model = getModelClass(modelType);
  const dependents = getModelDependents(Model);

  const directDependents = Array.from(dependents).filter(
    m => m.MVQueryDeps.includes(Model),
  );
  console.log(`${modelType} has ${directDependents.length} direct dependents:
${Array.from(directDependents).map(m => m.type).join('\n')}

${modelType} has ${dependents.size} indirect dependents:
${Array.from(dependents).filter(m => !directDependents.includes(m)).map(m => m.type).join('\n')}`);
}
