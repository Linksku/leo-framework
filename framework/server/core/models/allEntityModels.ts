import allModels from 'core/models/allModels';
import Entity from 'core/models/Entity';

export default allModels
  .map(model => model.Model)
  .filter(Model => TS.extends(Model, Entity)) as EntityClass[];
