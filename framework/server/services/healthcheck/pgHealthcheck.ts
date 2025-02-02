import knexBT from 'services/knex/knexBT';
import knexRR from 'services/knex/knexRR';
import EntityModels from 'core/models/allEntityModels';
import { HAS_MVS } from 'config/__generated__/consts';
import { addHealthcheck } from './HealthcheckManager';

addHealthcheck('pgBT', {
  disabled: !EntityModels.length,
  run: async function pgBTHealthcheck() {
    await knexBT.raw('SELECT 1 FROM pg_tables LIMIT 1');
  },
  runOnAllServers: true,
  resourceUsage: 'low',
  stability: 'high',
  timeout: 10 * 1000,
});

addHealthcheck('pgRR', {
  disabled: !HAS_MVS,
  run: async function pgRRHealthcheck() {
    await knexRR.raw('SELECT 1 FROM pg_tables LIMIT 1');
  },
  runOnAllServers: true,
  resourceUsage: 'low',
  stability: 'high',
  timeout: 10 * 1000,
});
