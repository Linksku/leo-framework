import verifyMZSinkConnectors from 'scripts/mv/helpers/verifyMZSinkConnectors';
import { addHealthcheck } from './HealthcheckManager';

addHealthcheck('mzSinkConnectors', {
  cb: async function mzSinkConnectorsHealthcheck() {
    await verifyMZSinkConnectors();
  },
  resourceUsage: 'mid',
  stability: 'mid',
  timeout: 10 * 1000,
});
