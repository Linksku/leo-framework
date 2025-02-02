import fetchMZPrometheusFailingSinkIds from 'scripts/monitorInfra/helpers/fetchMZPrometheusFailingSinkIds';
import { HAS_MVS } from 'config/__generated__/consts';
import { addHealthcheck } from './HealthcheckManager';

addHealthcheck('mzSinkPrometheus', {
  disabled: !HAS_MVS,
  run: async function mzSinkPrometheusHealthcheck() {
    const failing = await fetchMZPrometheusFailingSinkIds();
    if (failing.length) {
      throw getErr(
        'mzSinkPrometheusHealthcheck: failing sink topics',
        { models: failing.map(f => f.modelType) },
      );
    }
  },
  resourceUsage: 'mid',
  usesResource: 'mz',
  stability: 'low',
  // From Materialize's metrics-scraping-interval
  minUpdateFreq: 30 * 1000,
  timeout: 30 * 1000,
});
