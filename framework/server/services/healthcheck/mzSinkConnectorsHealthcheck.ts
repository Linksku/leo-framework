import verifyMZSinkConnectors from 'scripts/mv/helpers/verifyMZSinkConnectors';
import { addHealthcheck } from './HealthcheckManager';

addHealthcheck('mzSinkConnectors', {
  cb: async function mzSinkConnectorsHealthcheck() {
    await verifyMZSinkConnectors();
  },
  resourceUsage: 'mid',
  usesResource: 'kafka',
  stability: 'mid',
  timeout: 10 * 1000,
});
