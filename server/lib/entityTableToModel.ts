import entityModels from 'lib/entityModels';

const entityTableToModel = {} as Record<string, EntityModel>;
for (const Model of (Object.values(entityModels) as EntityModel[])) {
  entityTableToModel[Model.tableName] = Model;
}

export default entityTableToModel;
