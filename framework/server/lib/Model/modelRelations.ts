import type { RelationMappings } from 'objection';
import { Model as ObjectionModel } from 'objection';

export type Relations = ObjectOf<{
  relation: 'belongsTo' | 'hasOne' | 'hasMany' | 'manyToMany',
  model: ModelType,
  from: string,
  through?: {
    model: ModelType,
    from: string,
    to: string,
  },
  to: string,
  modify?: any,
}>;

export function relationsToMappings(
  Model: ModelClass,
  relations: Relations,
  schema: ModelSchema<IBaseModel>,
) {
  const obj: RelationMappings = {};
  for (const [k, r] of TS.objEntries(relations)) {
    if (!TS.hasProp(schema, r.from)) {
      throw new Error(`${Model.name}.relationMappings: ${Model.type}.${r.from} doesn't exist.`);
    }
    const otherModel = getModelClass<ModelType>(r.model);
    if (!TS.hasProp(otherModel.getSchema(), r.to)) {
      throw new Error(`${Model.name}.relationMappings: ${otherModel.type}.${r.to} doesn't exist.`);
    }

    obj[k] = {
      relation: {
        belongsTo: ObjectionModel.BelongsToOneRelation,
        hasOne: ObjectionModel.HasOneRelation,
        hasMany: ObjectionModel.HasManyRelation,
        manyToMany: ObjectionModel.ManyToManyRelation,
      }[r.relation],
      modelClass: otherModel,
      join: {
        // @ts-ignore wontfix key error
        from: Model.cols[r.from],
        // @ts-ignore wontfix key error
        to: otherModel.cols[r.to],
      },
    };
  }
  return obj;
}
