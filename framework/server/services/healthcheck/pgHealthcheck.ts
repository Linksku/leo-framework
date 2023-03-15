import knexBT from 'services/knex/knexBT';
import knexRR from 'services/knex/knexRR';
import { addHealthcheck } from './HealthcheckManager';

addHealthcheck('pgBT', {
  cb: async function pgBTHealthcheck() {
    await knexBT.raw('SELECT 1 FROM pg_tables LIMIT 1');
  },
  runOnAllServers: true,
  resourceUsage: 'low',
  stability: 'high',
  timeout: 10 * 1000,
});

addHealthcheck('pgRR', {
  cb: async function pgRRHealthcheck() {
    await knexRR.raw('SELECT 1 FROM pg_tables LIMIT 1');
  },
  runOnAllServers: true,
  resourceUsage: 'low',
  stability: 'high',
  timeout: 10 * 1000,
});
