import fromPairs from 'lodash/fromPairs';

import isSchemaNumeric from 'utils/models/isSchemaNumeric';

export function getApiId(ent: Model): ApiEntityId {
  const index = (ent.constructor as ModelClass).getPrimaryIndex();
  if (!Array.isArray(index)) {
    return ent[index];
  }
  return index
    .map(i => ent[i])
    .join(',');
}

export function apiIdToPartial<T extends ModelType>(
  entityType: T,
  id: ApiEntityId,
): ModelPartial<ModelTypeToClass<T>> {
  const Model = getModelClass(entityType);
  const index = Model.getPrimaryIndex();
  if (!Array.isArray(index)) {
    if (typeof id !== 'number') {
      throw new ErrorWithCtx(`apiIdToPartial: expected ${entityType}'s id to be number`, id);
    }
    return {
      [index]: id,
    } as ModelPartial<ModelTypeToClass<T>>;
  }

  if (typeof id !== 'string') {
    throw new ErrorWithCtx(`apiIdToPartial: expected ${entityType}'s api id to be string`, `${id}`);
  }
  const parts = id.split(',');
  if (parts.length !== index.length) {
    throw new ErrorWithCtx(`apiIdToPartial: invalid ${entityType} api id`, id);
  }

  return fromPairs(index.map((col, idx) => {
    const idVal = isSchemaNumeric(Model.getSchema()[col])
      ? TS.parseIntOrNull(parts[idx])
      : parts[idx];
    return [col, idVal];
  })) as ModelPartial<ModelTypeToClass<T>>;
}
