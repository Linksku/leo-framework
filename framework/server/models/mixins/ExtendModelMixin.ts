import BaseModel from 'core/models/Model';

export default function ExtendModelMixin<T extends ModelClass>(Model: T) {
  return {
    schema: Model.getSchema(),
    jsonAttributes: Model.jsonAttributes,
    uniqueIndexes: Model.uniqueIndexes,
    normalIndexes: Model.normalIndexes,
    relations: TS.extends(Model, BaseModel)
      ? Model.relations
      : {},
    MVQueryDeps: [Model],
    getMVQuery: () => modelQuery(Model)
      .select(Object.keys(Model.getSchema()).map(k => `${Model.tableName}.${k}`)),
  };
}
