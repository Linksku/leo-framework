import allModels from 'services/model/allModels';

const entityTableToModel = {} as Record<string, ModelClass>;
for (const { Model } of allModels) {
  entityTableToModel[Model.tableName] = Model;
}

export default entityTableToModel;
