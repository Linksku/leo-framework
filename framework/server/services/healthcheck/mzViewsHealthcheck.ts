import showMzSystemRows from 'utils/db/showMzSystemRows';
import MaterializedViewModels from 'services/model/allMaterializedViewModels';
import getEntitiesForMZSources from 'scripts/mv/helpers/getEntitiesForMZSources';
import { addHealthcheck } from './HealthcheckManager';

const expectedViews: string[] = [
  ...MaterializedViewModels.map(Model => Model.type),
  ...getEntitiesForMZSources('pg')
    .map(Model => Model.type),
];

addHealthcheck('mzViews', {
  deps: ['mzSources'],
  cb: async function mzViewsHealthcheck() {
    const views = await showMzSystemRows('SHOW VIEWS');
    if (views.length === 0) {
      throw new Error('mzViewsHealthcheck: no views');
    }
    if (views.length < expectedViews.length) {
      const missingViews = expectedViews.filter(view => !views.includes(view));
      throw getErr('mzViewsHealthcheck: missing views', { missingViews });
    }
    if (views.length > expectedViews.length) {
      const extraViews = views.filter(view => !expectedViews.includes(view));
      throw getErr('mzViewsHealthcheck: extra views', { extraViews });
    }
  },
  resourceUsage: 'mid',
  usesResource: 'mz',
  stability: 'mid',
  timeout: 2 * 60 * 1000,
});
