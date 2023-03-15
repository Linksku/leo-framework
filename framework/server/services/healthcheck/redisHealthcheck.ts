import redis from 'services/redis';
import { addHealthcheck } from './HealthcheckManager';

addHealthcheck('redis', {
  cb: async function redisHealthcheck() {
    const res = await redis.ping();
    if (res !== 'PONG') {
      throw new Error('redisHealthcheck: ping failed');
    }
  },
  // runOnAllServers has to be true because otherwise healthchecks won't run when Redis is down
  runOnAllServers: true,
  resourceUsage: 'low',
  stability: 'mid',
  timeout: 10 * 1000,
});
