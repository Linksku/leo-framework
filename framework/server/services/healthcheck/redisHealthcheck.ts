import { ExecutionError } from 'redlock';

import redis from 'services/redis';
import redlock from 'services/redis/redlock';
import { INIT_INFRA_LOCK_NAME, INIT_INFRA_LOCK_TTL } from 'consts/infra';
import exec from 'utils/exec';
import { APP_NAME_LOWER } from 'config';
import { addHealthcheck } from './HealthcheckManager';

addHealthcheck('redis', {
  run: async function redisHealthcheck() {
    const res = await redis.ping();
    if (res !== 'PONG') {
      throw new Error('redisHealthcheck: ping failed');
    }
  },
  // runOnAllServers has to be true because otherwise healthchecks won't run when Redis is down
  runOnAllServers: true,
  resourceUsage: 'low',
  stability: 'med',
  timeout: 10 * 1000,
  async fix() {
    try {
      // Fail if connection fails, but not if lock is in use
      await redlock.acquire([INIT_INFRA_LOCK_NAME], INIT_INFRA_LOCK_TTL);
    } catch (err) {
      if (err instanceof ExecutionError
        && err.message.includes('The operation was unable to achieve a quorum during its retry window')) {
        throw new Error('fixInfra: failed to acquire Redlock');
      }
    }

    await exec(`yarn dc -p ${APP_NAME_LOWER} --compatibility restart redis`);
  },
});
