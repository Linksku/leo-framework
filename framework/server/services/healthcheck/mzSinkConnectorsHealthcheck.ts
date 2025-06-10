import verifyMZSinkConnectors from 'scripts/mv/helpers/verifyMZSinkConnectors';
import { HAS_MVS } from 'config/__generated__/consts';
import { addHealthcheck } from './HealthcheckManager';

addHealthcheck('mzSinkConnectors', {
  disabled: !HAS_MVS,
  run: async function mzSinkConnectorsHealthcheck() {
    await verifyMZSinkConnectors(0.05);
  },
  resourceUsage: 'med',
  usesResource: 'kafka',
  stability: 'med',
  timeout: 10 * 1000,
});
