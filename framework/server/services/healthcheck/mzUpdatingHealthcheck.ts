import checkMZUpdating from 'scripts/mv/helpers/checkMZUpdating';
import { addHealthcheck } from './HealthcheckManager';

// todo: mid/mid split mzUpdatingHealthcheck into steps
addHealthcheck('mzUpdating', {
  deps: [
    'pgBT',
    'replicationSlots',
    'dbzConnectors',
    'mzSources',
    'mzViews',
    'mzSinks',
    'mzSinkTopics',
    'mzSinkTopicMessages',
    'mzSinkConnectors',
    'rrMVs',
  ],
  cb: async function mzUpdatingHealthcheck() {
    await checkMZUpdating(60 * 1000);
  },
  resourceUsage: 'high',
  stability: 'low',
  timeout: 60 * 1000,
});
