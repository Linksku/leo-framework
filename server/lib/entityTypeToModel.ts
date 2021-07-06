import entityModels from 'lib/entityModels';

const typeToModel: ObjectOf<EntityModel> = {};
for (const Model of Object.values(entityModels)) {
  typeToModel[Model.type] = Model;
}

export default typeToModel;
