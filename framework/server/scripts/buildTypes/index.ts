import buildGlobalTypes from './buildGlobalTypes';
import buildServerModelsTypes from './buildServerModelsTypes';
import buildServerModelsClasses from './buildServerModelsClasses';
import buildWebModelsTypes from './buildWebModelsTypes';
import buildSharedModelsTypes from './buildSharedModelsTypes';
import buildApiTypes from './buildApiTypes';

export default async function buildTypes() {
  await Promise.all([
    buildGlobalTypes(),
    buildServerModelsTypes(),
    buildServerModelsClasses(),
    buildWebModelsTypes(),
    buildSharedModelsTypes(),
    buildApiTypes(),
  ]);
}
