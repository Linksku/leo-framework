import allModels from 'services/model/allModels';
import MaterializedView, { MaterializedViewClass } from 'services/model/MaterializedView';

export default Object.values(allModels)
  .map(model => model.Model)
  .filter(Model => TS.extends(Model, MaterializedView)) as MaterializedViewClass[];
