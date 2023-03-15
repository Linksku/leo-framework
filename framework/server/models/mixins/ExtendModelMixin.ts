import BaseModel from 'services/model/Model';

export default function ExtendModelMixin<T extends ModelClass>(Model: T) {
  return {
    schema: Model.getSchema(),
    jsonAttributes: Model.jsonAttributes,
    uniqueIndexes: Model.uniqueIndexes,
    normalIndexes: Model.normalIndexes,
    relations: Model.prototype instanceof BaseModel
      ? (Model as unknown as ModelClass).relations
      : {},
    MVQueryDeps: [Model],
    getMVQuery: () => modelQuery(Model)
      .select(Object.keys(Model.getSchema()).map(k => `${Model.tableName}.${k}`)),
  };
}
