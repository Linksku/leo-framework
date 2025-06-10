import checkMZUpdating from 'scripts/mv/helpers/checkMZUpdating';
import { HAS_MVS } from 'config/__generated__/consts';
import { addHealthcheck } from './HealthcheckManager';

// todo: low/med split mzUpdatingHealthcheck into steps
addHealthcheck('mzUpdating', {
  disabled: !HAS_MVS,
  deps: [
    'pgBT',
    'replicationSlots',
    'dbzConnectors',
  ],
  run: async function mzUpdatingHealthcheck() {
    await checkMZUpdating(2 * 60 * 1000);
  },
  resourceUsage: 'high',
  usesResource: 'mz',
  stability: 'low',
  timeout: 2 * 60 * 1000,
});
