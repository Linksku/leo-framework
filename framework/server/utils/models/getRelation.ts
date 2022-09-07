import type { ModelRelation } from 'services/model/helpers/modelRelations';

export default function getRelation(
  modelType: ModelType,
  relationName: string,
): ModelRelation | [ModelRelation, ModelRelation] {
  const modelRelations = getModelClass(modelType).relationsMap;

  const parts = relationName.split('.');
  if (parts.length > 2) {
    throw new Error(`Invalid relation "${relationName}"`);
  }
  const [name, nestedName] = parts;
  if (!TS.hasProp(modelRelations, name)) {
    throw new UserFacingError(`Invalid relation "${modelType}.${relationName}"`, 400);
  }
  const relation = TS.defined(modelRelations[name]);
  if (!nestedName) {
    return relation;
  }

  const nestedModel = relation.toModel;
  if (!TS.hasProp(nestedModel.relationsMap, nestedName)) {
    throw new UserFacingError(`Invalid nested relation "${nestedModel.type}.${nestedName}"`, 400);
  }

  return [relation, TS.defined(nestedModel.relationsMap[nestedName])];
}
