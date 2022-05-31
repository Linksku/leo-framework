export type RelationConfig = {
  name?: string,
  through?: {
    model: ModelType,
    from: string,
    to: string,
  },
  modify?: any,
};

export type RelationsConfig = ObjectOf<ObjectOf<RelationConfig>>;

export type RelationsMap = ObjectOf<{
  name: string,
  relationType: ModelRelationType,
  fromModel: ModelClass,
  fromCol: string,
  toModel: ModelClass,
  toCol: string,
  through?: {
    model: ModelClass,
    from: string,
    to: string,
  },
}>;

function getRelationType({
  fromModel,
  fromCol,
  toModel,
  toCol,
  through,
}: {
  fromModel: ModelClass,
  fromCol: string,
  toModel: ModelClass,
  toCol: string,
  through?: {
    model: ModelClass,
    from: string,
    to: string,
  },
}) {
  const isFromUnique = fromModel.getUniqueIndexes()
    .some(idx => idx.length === 1 && idx[0] === fromCol);
  const isToUnique = toModel.getUniqueIndexes()
    .some(idx => idx.length === 1 && idx[0] === toCol);

  if (!through) {
    if (isFromUnique && isToUnique) {
      if (fromCol === 'id' && toCol === 'id') {
        throw new Error(`getRelationType(${fromModel.name}): unknown relation from "id" to "id".`);
      }
      if (fromCol === 'id') {
        return 'hasOne';
      }
      if (toCol === 'id') {
        return 'belongsToOne';
      }
      throw new Error(`getRelationType(${fromModel.name}): unknown relation when neither is "id".`);
    }
    if (isFromUnique) {
      return 'hasMany';
    }
    if (isToUnique) {
      return 'belongsToOne';
    }
    throw new Error(`getRelationType(${fromModel.name}): "through" required for ${fromModel.type}.${fromCol} <=> ${toModel.type}.${toCol}.`);
  }

  const isThroughFromUnique = through.model.getUniqueIndexes()
    .some(idx => idx.length === 1 && idx[0] === through.from);
  const isThroughToUnique = through.model.getUniqueIndexes()
    .some(idx => idx.length === 1 && idx[0] === through.to);
  if (isThroughFromUnique !== isThroughToUnique) {
    throw new Error(`getRelationType(${fromModel.name}): invalid through ${through.from} <=> ${through.to}`);
  }

  if (isThroughFromUnique) {
    if (isFromUnique && isToUnique) {
      if (fromCol === 'id') {
        return 'hasOne';
      }
      if (toCol === 'id') {
        return 'belongsToOne';
      }
      throw new Error(`getRelationType(${fromModel.name}): unknown through relation when neither is "id".`);
    }
    if (isFromUnique) {
      return 'hasMany';
    }
    if (isToUnique) {
      return 'belongsToOne';
    }
  }
  return 'manyToMany';
}

export function getRelationsMap(
  Model: ModelClass,
  relationConfig: RelationsConfig,
): RelationsMap {
  const relationsMap: RelationsMap = Object.create(null);
  for (const [fromCol, colRelations] of TS.objEntries(relationConfig)) {
    for (const [toModelCol, config] of TS.objEntries(colRelations)) {
      const toModelColParts = toModelCol.split('.');
      if (toModelColParts.length !== 2) {
        throw new Error(`getRelationsMap(${Model.name}): invalid toModelCol "${toModelCol}".`);
      }
      const toModelType = toModelColParts[0] as ModelType;
      const toCol = toModelColParts[1];
      if (!TS.hasProp(Model.getSchema(), fromCol)) {
        throw new Error(`getRelationsMap(${Model.name}): from ${Model.type}.${fromCol} doesn't exist.`);
      }
      const toModel = getModelClass<ModelType>(toModelType);
      if (!TS.hasProp(toModel.getSchema(), toCol)) {
        throw new Error(`getRelationsMap(${Model.name}): to ${toModel.type}.${toCol} doesn't exist.`);
      }

      const name = config.name ?? toModel.type;
      if (relationsMap[name]) {
        throw new Error(`getRelationsMap(${Model.name}): "${name}" is duplicate.`);
      }

      if (config.through) {
        const throughModel = getModelClass<ModelType>(config.through.model);
        if (!TS.hasProp(throughModel.getSchema(), config.through.from)) {
          throw new Error(`getRelationsMap(${Model.name}): through.from "${throughModel.type}.${config.through.from}" doesn't exist.`);
        }
        if (!TS.hasProp(throughModel.getSchema(), config.through.to)) {
          throw new Error(`getRelationsMap(${Model.name}): through.to "${throughModel.type}.${config.through.to}" doesn't exist.`);
        }
      }

      const throughModel = config.through ? getModelClass<ModelType>(config.through.model) : null;
      const relationType = getRelationType({
        fromModel: Model,
        fromCol,
        toModel,
        toCol,
        through: config.through && throughModel ? {
          model: throughModel,
          from: config.through.from,
          to: config.through.to,
        } : undefined,
      });
      relationsMap[name] = {
        name,
        fromModel: Model,
        fromCol,
        toModel,
        toCol,
        relationType,
        through: config.through
          ? {
            model: getModelClass<ModelType>(config.through.model),
            from: config.through.from,
            to: config.through.to,
          } : undefined,
      };
    }
  }
  return relationsMap;
}
