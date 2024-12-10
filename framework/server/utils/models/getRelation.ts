import type { ModelRelation } from 'core/models/modelRelations';

export default function getRelation(
  modelType: ModelType,
  relationName: string,
): ModelRelation | [ModelRelation, ModelRelation] {
  const modelRelations = getModelClass(modelType).relationsMap;

  const parts = relationName.split('.');
  if (parts.length > 2) {
    throw new Error(`getRelation(${modelType}): invalid relation "${relationName}"`);
  }
  const [name, nestedName] = parts;
  if (!TS.hasProp(modelRelations, name)) {
    throw new Error(`getRelation(${modelType}): non-existant relation "${relationName}"`);
  }
  const relation = TS.defined(modelRelations[name]);
  if (!nestedName) {
    return relation;
  }

  const nestedModel = relation.toModel;
  if (!TS.hasProp(nestedModel.relationsMap, nestedName)) {
    throw new Error(`getRelation(${modelType}): invalid nested relation "${nestedModel.type}.${nestedName}"`);
  }

  return [relation, TS.defined(nestedModel.relationsMap[nestedName])];
}
