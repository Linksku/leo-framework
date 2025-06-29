import showMzSystemRows from 'utils/db/showMzSystemRows';
import MaterializedViewModels from 'core/models/allMaterializedViewModels';
import getEntitiesForMZSources from 'scripts/mv/helpers/getEntitiesForMZSources';
import { HAS_MVS } from 'config/__generated__/consts';
import { addHealthcheck } from './HealthcheckManager';

const expectedViews: string[] = [
  ...MaterializedViewModels.map(Model => Model.type),
  ...getEntitiesForMZSources('pg')
    .map(Model => Model.type),
];

addHealthcheck('mzViews', {
  disabled: !HAS_MVS,
  deps: ['mzSources'],
  run: async function mzViewsHealthcheck() {
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
  resourceUsage: 'med',
  usesResource: 'mz',
  stability: 'med',
  timeout: 2 * 60 * 1000,
});
