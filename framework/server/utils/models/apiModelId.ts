import isSchemaNumeric from 'utils/models/isSchemaNumeric';

export function getApiId(ent: Model): ApiEntityId {
  const index = (ent.constructor as ModelClass).getPrimaryIndex();
  if (typeof index === 'string') {
    // todo: low/med type of Model shouldn't be { __isModel: boolean }
    const id = ent[index];
    if (!process.env.PRODUCTION
      && typeof id !== 'number'
      && typeof id !== 'string') {
      throw getErr(
        `getApiId(${ent.constructor.name}): id has unexpected type`,
        { id, type: typeof id });
    }
    return typeof id === 'number' ? id : `${id}`;
  }

  if (!process.env.PRODUCTION
    && !index.every(col => typeof ent[col] === 'number' || typeof ent[col] === 'string')) {
    throw getErr(
      `getApiId(${ent.constructor.name}): id has unexpected type`,
      { id: index.map(i => ent[i]), types: index.map(i => typeof ent[i]) },
    );
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
  if (typeof index === 'string') {
    if (typeof id !== 'number') {
      throw getErr(`apiIdToPartial: expected ${entityType}'s id to be number`, { id });
    }
    return {
      [index]: id,
    } as unknown as ModelPartial<ModelTypeToClass<T>>;
  }

  if (typeof id !== 'string') {
    throw getErr(`apiIdToPartial: expected ${entityType}'s api id to be string`, { id });
  }
  const parts = id.split(',');
  if (parts.length !== index.length) {
    throw getErr(`apiIdToPartial: invalid ${entityType} api id`, { id });
  }

  return Object.fromEntries(index.map((col, idx) => {
    const idVal = isSchemaNumeric(Model.getSchema()[col])
      ? TS.parseIntOrNull(parts[idx])
      : parts[idx];
    return [col, idVal];
  })) as ModelPartial<ModelTypeToClass<T>>;
}
