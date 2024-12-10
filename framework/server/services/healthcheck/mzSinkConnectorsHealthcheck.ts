import verifyMZSinkConnectors from 'scripts/mv/helpers/verifyMZSinkConnectors';
import { addHealthcheck } from './HealthcheckManager';

addHealthcheck('mzSinkConnectors', {
  run: async function mzSinkConnectorsHealthcheck() {
    await verifyMZSinkConnectors(0.05);
  },
  resourceUsage: 'mid',
  usesResource: 'kafka',
  stability: 'mid',
  timeout: 10 * 1000,
});
