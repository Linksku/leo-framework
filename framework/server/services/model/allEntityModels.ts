import allModels from 'services/model/allModels';
import Entity from 'services/model/Entity';

export default Object.values(allModels)
  .map(model => model.Model)
  .filter(Model => TS.extends(Model, Entity)) as EntityClass[];
