import allModels from 'services/model/allModels';
import Entity from 'services/model/Entity';

export default Object.values(allModels)
  .map(model => model.Model)
  .filter(model => model.prototype instanceof Entity) as EntityClass[];
