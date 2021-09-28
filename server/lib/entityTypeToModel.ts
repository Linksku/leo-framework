import entityModels from 'lib/entityModels';

const entityTypeToModel = {} as Record<EntityType, EntityModel>;
for (const Model of (Object.values(entityModels) as EntityModel[])) {
  entityTypeToModel[Model.type] = Model;
}

export default entityTypeToModel;
