import buildGlobalTypes from './buildGlobalTypes';
import buildServerModelsTypes from './buildServerModelsTypes';
import buildWebModelsTypes from './buildWebModelsTypes';
import buildSharedModelsTypes from './buildSharedModelsTypes';
import buildApiTypes from './buildApiTypes';

export default async function buildTypes() {
  await Promise.all([
    buildGlobalTypes(),
    buildServerModelsTypes(),
    buildWebModelsTypes(),
    buildSharedModelsTypes(),
    buildApiTypes(),
  ]);
}
