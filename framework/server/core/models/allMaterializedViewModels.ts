import allModels from 'core/models/allModels';
import MaterializedView, { MaterializedViewClass } from 'core/models/MaterializedView';

export default Object.values(allModels)
  .map(model => model.Model)
  .filter(Model => TS.extends(Model, MaterializedView)) as MaterializedViewClass[];
