import showMzSystemRows from 'utils/db/showMzSystemRows';
import MaterializedViewModels from 'services/model/allMaterializedViewModels';
import { addHealthcheck } from './HealthcheckManager';

addHealthcheck('mzViews', {
  deps: ['mzSources'],
  cb: async function mzViewsHealthcheck() {
    const views = await showMzSystemRows('SHOW VIEWS');
    if (views.length === 0) {
      throw new Error('mzViewsHealthcheck: no views');
    }
    if (views.length < MaterializedViewModels.length) {
      throw new Error('mzViewsHealthcheck: missing views');
    }
    if (views.length > MaterializedViewModels.length) {
      throw new Error('mzViewsHealthcheck: extra views');
    }
  },
  resourceUsage: 'mid',
  stability: 'mid',
  timeout: 10 * 1000,
});
