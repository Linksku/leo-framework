import type ModelsType from 'core/models/allModels';

let typeToModel: Map<ModelType, ModelClass>;

// For preventing circular dependencies.
export default function getModelClass<T extends ModelType = ModelType>(
  // Don't infer T because ModelTypeToClass is slow if it returns a union
  type: ModelType,
): ModelTypeToClass<T> {
  if (!typeToModel) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const models = (require('core/models/allModels') as { default: typeof ModelsType })
      .default;
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
