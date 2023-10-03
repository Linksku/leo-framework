import showMzSystemRows from 'utils/db/showMzSystemRows';
import MaterializedViewModels from 'services/model/allMaterializedViewModels';
import getEntitiesWithMZSources from 'scripts/mv/helpers/getEntitiesWithMZSources';
import { ENABLE_DBZ } from 'consts/mz';
import { addHealthcheck } from './HealthcheckManager';

const expectedViews: string[] = ENABLE_DBZ
  ? MaterializedViewModels.map(model => model.type)
  : [
    ...MaterializedViewModels.map(model => model.type),
    ...getEntitiesWithMZSources(),
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
  stability: 'mid',
  timeout: 10 * 1000,
});
