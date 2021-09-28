import defaultModels from 'models/defaultModels';
import srcModels from 'config/models';

export default {
  ...defaultModels,
  ...srcModels,
} as ObjectOf<EntityModel>;
