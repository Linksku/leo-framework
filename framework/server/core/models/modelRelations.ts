import getNonNullSchema from 'utils/models/getNonNullSchema';
import isUniqueModelCols from 'utils/models/isUniqueModelCols';

export type ModelRelationSpec = {
  name?: string,
  consts?: ObjectOf<string>,
  through?: {
    model: RRModelType,
    from: string,
    to: string,
    // Can add through consts if needed
  },
};

export type ModelRelationsSpecs = ObjectOf<Partial<Record<
  `${RRModelType}.${string}`,
  ModelRelationSpec
>>>;

export type ModelRelationThrough = {
  model: RRModelClass,
  from: string,
  to: string,
};

export type ModelRelation = {
  name: string,
  relationType: ModelRelationType,
  fromModel: RRModelClass,
  fromCol: string,
  through?: ModelRelationThrough,
  toModel: RRModelClass,
  toCol: string,
  consts?: ObjectOf<string>,
};

// Key is relation name
export type ModelRelationsMap = ObjectOf<ModelRelation>;

function getRelationType({
  fromModel,
  fromCol,
  through,
  toModel,
  toCol,
  consts,
}: Pick<
  ModelRelation,
  'fromModel' | 'fromCol' | 'through' | 'toModel' | 'toCol' | 'consts'
>): ModelRelationType {
  const isFromUnique = fromModel.getUniqueSingleColumnsSet().has(fromCol as ModelKey<RRModelClass>);
  const isFromArray = getNonNullSchema(fromModel.getSchema()[fromCol as ModelKey<RRModelClass>])
    .nonNullType === 'array';
  const isToUniqueWithConsts = toModel.getUniqueSingleColumnsSet()
    .has(toCol as ModelKey<RRModelClass>);
  const isToUnique = isToUniqueWithConsts
    || (consts && toModel.getUniqueIndexes().some(
      index => Array.isArray(index)
        && index.length === Object.keys(consts).length + 1
        && index.every(col => col === toCol || col in consts),
    ));
  const isToArray = getNonNullSchema(toModel.getSchema()[toCol as ModelKey<RRModelClass>])
    .nonNullType === 'array';

  if (isFromArray && !isToUnique) {
    throw new Error(`getRelationType(${fromModel.name}): "${fromCol}" can't reference non-unique`);
  }
  if (isToArray) {
    throw new Error(`getRelationType(${fromModel.name}): "${fromCol}" can't reference array`);
  }
  if (consts && isToUniqueWithConsts) {
    throw new Error(`getRelationType(${fromModel.name}): unnecessary consts for "${fromCol}"`);
  }

  if (!through) {
    if (isFromArray) {
      // Could be hasMany, but can't tell the difference
      return 'manyToMany';
    }
    if (isFromUnique && isToUnique) {
      if (fromCol === 'id') {
        return 'hasOne';
      }
      if (toCol === 'id') {
        return 'belongsToOne';
      }
      throw new Error(`getRelationType(${fromModel.name}): unknown relation when neither is "id".`);
    }
    if (isFromUnique) {
      if (consts && isUniqueModelCols(toModel, [toCol, ...TS.objKeys(consts)])) {
        return 'hasOne';
      }
      return 'hasMany';
    }
    if (isToUnique) {
      return 'belongsToOne';
    }
    throw new Error(
      `getRelationType(${fromModel.name}): "through" required for ${fromModel.type}.${fromCol} <=> ${toModel.type}.${toCol}.`,
    );
  }

  const isThroughFromUnique = through.model.getUniqueIndexes()
    .some(idx => (Array.isArray(idx)
      ? idx.length === 1 && idx[0] === through.from
      : idx === through.from));
  const isThroughFromArray = getNonNullSchema(
    through.model.getSchema()[through.from as ModelKey<RRModelClass>],
  ).nonNullType === 'array';
  const isThroughToUnique = through.model.getUniqueIndexes()
    .some(idx => (Array.isArray(idx)
      ? idx.length === 1 && idx[0] === through.to
      : idx === through.to));
  const isThroughToArray = getNonNullSchema(
    through.model.getSchema()[through.to as ModelKey<RRModelClass>],
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
  Model: RRModelClass,
  relationsSpecs: ModelRelationsSpecs,
): ModelRelationsMap {
  const relationsMap: ModelRelationsMap = Object.create(null);
  for (const [fromCol, colRelations] of TS.objEntries(relationsSpecs)) {
    for (const [toModelCol, config] of TS.objEntries(colRelations)) {
      const toModelColParts = toModelCol.split('.');
      if (toModelColParts.length !== 2) {
        throw new Error(`getRelationsMap(${Model.name}): invalid toModelCol "${toModelCol}".`);
      }
      const toModelType = toModelColParts[0] as RRModelType;
      const toCol = toModelColParts[1];
      if (!TS.hasProp(Model.getSchema(), fromCol)) {
        throw new Error(`getRelationsMap(${Model.name}): from ${Model.type}.${fromCol} doesn't exist.`);
      }
      const toModel = getModelClass(toModelType) as RRModelClass;
      if (toModel.getReplicaTable() === null) {
        throw new Error(`getRelationsMap(${Model.name}): to "${toModel.type}" isn't in RR.`);
      }
      if (!TS.hasProp(toModel.getSchema(), toCol)) {
        throw new Error(`getRelationsMap(${Model.name}): to "${toModel.type}.${toCol}" doesn't exist.`);
      }

      const name = config.name ?? toModel.type;
      if (relationsMap[name]) {
        throw new Error(`getRelationsMap(${Model.name}): "${name}" is duplicate.`);
      }

      const throughModel = config.through
        ? getModelClass(config.through.model) as RRModelClass
        : null;
      if (config.through && throughModel) {
        if (toModel.getReplicaTable() === null) {
          throw new Error(`getRelationsMap(${Model.name}): through "${toModel.type}" isn't in RR.`);
        }
        if (!TS.hasProp(throughModel.getSchema(), config.through.from)) {
          throw new Error(
            `getRelationsMap(${Model.name}): through.from "${throughModel.type}.${config.through.from}" doesn't exist.`,
          );
        }
        if (!TS.hasProp(throughModel.getSchema(), config.through.to)) {
          throw new Error(
            `getRelationsMap(${Model.name}): through.to "${throughModel.type}.${config.through.to}" doesn't exist.`,
          );
        }
      }

      if (config.consts) {
        for (const col of TS.objKeys(config.consts)) {
          if (!TS.hasProp(toModel.getSchema(), col)) {
            throw new Error(`getRelationsMap(${Model.name}): consts col "${toModel.type}.${col}" doesn't exist.`);
          }
        }

        if (config.consts[toCol]) {
          throw new Error(`getRelationsMap(${Model.name}): can't have consts col "${toModel.type}.${toCol}".`);
        }
      }

      const relationType = getRelationType({
        fromModel: Model,
        fromCol,
        through: config.through && throughModel
          ? {
            model: throughModel,
            from: config.through.from,
            to: config.through.to,
          }
          : undefined,
        toModel,
        toCol,
        consts: config.consts,
      });

      relationsMap[name] = {
        name,
        relationType,
        fromModel: Model,
        fromCol,
        through: config.through
          ? {
            model: TS.notNull(throughModel),
            from: config.through.from,
            to: config.through.to,
          }
          : undefined,
        toModel,
        toCol,
        consts: config.consts,
      };
    }
  }
  return relationsMap;
}
