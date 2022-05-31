import allModels from 'services/model/allModels';
import MaterializedView, { MaterializedViewClass } from 'services/model/MaterializedView';

export default Object.values(allModels)
  .map(model => model.Model)
  .filter(
    model => model.prototype instanceof MaterializedView,
  ) as MaterializedViewClass[];
