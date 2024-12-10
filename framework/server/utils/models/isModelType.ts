import allModels from 'core/models/allModels';

const modelTypesSet = new Set<string>(allModels.map(m => m.type));

export default function isModelType(str: string): str is ModelType {
  return modelTypesSet.has(str);
}
