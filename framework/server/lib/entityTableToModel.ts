import models from 'lib/Model/models';

const entityTableToModel = {} as Record<string, ModelClass>;
for (const { Model } of models) {
  entityTableToModel[Model.tableName] = Model;
}

export default entityTableToModel;
