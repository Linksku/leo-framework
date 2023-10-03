import type ModelsType from 'services/model/allModels';

let typeToModel: Map<ModelType, ModelClass>;

// For preventing circular dependencies.
export default function getModelClass<T extends ModelType = ModelType>(
  // Don't infer T because ModelTypeToClass is slow if it returns a union
  type: ModelType,
): ModelTypeToClass<T> {
  if (!typeToModel) {
    // eslint-disable-next-line unicorn/prefer-module
    const models: typeof ModelsType = require('services/model/allModels').default;
    typeToModel = new Map<ModelType, ModelClass>();
    for (const { Model } of models) {
      typeToModel.set(Model.type, Model);
    }
  }

  const Model = typeToModel.get(type);
  if (!Model) {
    throw new Error(`getModelClass: ${type} doesn't exist`);
  }
  return Model as ModelTypeToClass<T>;
}
