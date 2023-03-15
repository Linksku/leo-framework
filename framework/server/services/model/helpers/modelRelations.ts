import getNonNullSchema from 'utils/models/getNonNullSchema';

export type ModelRelationSpec = {
  name?: string,
  through?: {
    model: ModelType,
    from: string,
    to: string,
  },
};

export type ModelRelationsSpecs = ObjectOf<ObjectOf<ModelRelationSpec>>;

export type ModelRelationThrough = {
  model: ModelClass,
  from: string,
  to: string,
};

export type ModelRelation = {
  name: string,
  relationType: ModelRelationType,
  fromModel: ModelClass,
  fromCol: string,
  toModel: ModelClass,
  toCol: string,
  through?: ModelRelationThrough,
};

export type ModelRelationsMap = ObjectOf<ModelRelation>;

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
  const isFromUnique = fromModel.getUniqueColumnsSet().has(fromCol as ModelKey<ModelClass>);
  const isFromArray = getNonNullSchema(
    fromModel.getSchema()[fromCol as ModelKey<ModelClass>],
  ).nonNullType === 'array';
  const isToUnique = toModel.getUniqueColumnsSet().has(toCol as ModelKey<ModelClass>);
  const isToArray = getNonNullSchema(
    toModel.getSchema()[toCol as ModelKey<ModelClass>],
  ).nonNullType === 'array';
  if (isToArray) {
    throw new Error(`getRelationType(${fromModel.name}): to column can't be array`);
  }

  if (!through) {
    if (isFromArray) {
      return 'manyToMany';
    }
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
  const isThroughFromArray = getNonNullSchema(
    through.model.getSchema()[through.from as ModelKey<ModelClass>],
  ).nonNullType === 'array';
  const isThroughToUnique = through.model.getUniqueIndexes()
    .some(idx => idx.length === 1 && idx[0] === through.to);
  const isThroughToArray = getNonNullSchema(
    through.model.getSchema()[through.to as ModelKey<ModelClass>],
  ).nonNullType === 'array';
  if (isThroughFromArray) {
    throw new Error(`getRelationType(${fromModel.name}): through from column can't be array`);
  }
  if (isThroughToArray) {
    return 'manyToMany';
  }
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
  relationsSpecs: ModelRelationsSpecs,
): ModelRelationsMap {
  const relationsMap: ModelRelationsMap = Object.create(null);
  for (const [fromCol, colRelations] of TS.objEntries(relationsSpecs)) {
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
      const toModel = getModelClass(toModelType);
      if (!TS.hasProp(toModel.getSchema(), toCol)) {
        throw new Error(`getRelationsMap(${Model.name}): to ${toModel.type}.${toCol} doesn't exist.`);
      }

      const name = config.name ?? toModel.type;
      if (relationsMap[name]) {
        throw new Error(`getRelationsMap(${Model.name}): "${name}" is duplicate.`);
      }

      if (config.through) {
        const throughModel = getModelClass(config.through.model);
        if (!TS.hasProp(throughModel.getSchema(), config.through.from)) {
          throw new Error(`getRelationsMap(${Model.name}): through.from "${throughModel.type}.${config.through.from}" doesn't exist.`);
        }
        if (!TS.hasProp(throughModel.getSchema(), config.through.to)) {
          throw new Error(`getRelationsMap(${Model.name}): through.to "${throughModel.type}.${config.through.to}" doesn't exist.`);
        }
      }

      const throughModel = config.through ? getModelClass(config.through.model) : null;
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
            model: getModelClass(config.through.model),
            from: config.through.from,
            to: config.through.to,
          } : undefined,
      };
    }
  }
  return relationsMap;
}
