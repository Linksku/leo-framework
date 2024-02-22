import checkMZUpdating from 'scripts/mv/helpers/checkMZUpdating';
import { addHealthcheck } from './HealthcheckManager';

// todo: low/mid split mzUpdatingHealthcheck into steps
addHealthcheck('mzUpdating', {
  deps: [
    'pgBT',
    'replicationSlots',
    'dbzConnectors',
  ],
  cb: async function mzUpdatingHealthcheck() {
    await checkMZUpdating(2 * 60 * 1000);
  },
  resourceUsage: 'high',
  usesResource: 'mz',
  stability: 'low',
  timeout: 2 * 60 * 1000,
});
