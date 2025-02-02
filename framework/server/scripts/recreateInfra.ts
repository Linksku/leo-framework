import type { Arguments } from 'yargs';
import { ExecutionError, type Lock } from 'redlock';

import redlock from 'services/redis/redlock';
import {
  INIT_INFRA_LOCK_NAME,
  INIT_INFRA_LOCK_TTL,
  INIT_INFRA_REDIS_KEY,
} from 'consts/infra';
import { seedDb } from 'config/functions';
import { isRedisUnavailableErr, redisMaster } from 'services/redis';
import initInfraWrap from 'utils/infra/initInfraWrap';
import startDockerCompose from 'scripts/startDockerCompose';
import deleteDockerCompose from './mv/steps/deleteDockerCompose';
import destroyMVInfra from './mv/destroyMVInfra';
import dropDbs from './db/dropDbs';
import restorePgdump from './db/restorePgdump';
import initRR from './mv/initRR';
import initMVInfra from './mv/initMVInfra';

/*
- Delete MZ sinks
- Delete MZ views
- Delete DBZ connectors
- Delete Docker MZ volume
- Delete RR subscriptions
- Delete RR data
- Flush Redis
- Clear Schema Registry
- Delete BT replication slots
- Delete BT publications
- Delete DB data

- Restore DB pgdump
- Create BT publications
- Create BT replication slots
- Create RR subscription
- Seed DB
- Start Docker
- Create DBZ connectors
- Create MZ views
- Create MZ sinks
*/

// todo: low/mid create pg db and user
// todo: low/mid use superuser for infra scripts and limit pg user permissions
export default async function recreateInfra(args?: Arguments<{
  destroy: boolean,
}>) {
  let lock: Lock | null = null;
  try {
    lock = await redlock.acquire([INIT_INFRA_LOCK_NAME], INIT_INFRA_LOCK_TTL);
    await redisMaster.setex(INIT_INFRA_REDIS_KEY, INIT_INFRA_LOCK_TTL / 1000, '1');
  } catch (err) {
    if ((err instanceof ExecutionError
        && err.message.includes('The operation was unable to achieve a quorum during its retry window'))
      || (err instanceof Error
        && err.message.includes('timed out acquiring lock')
        && (redisMaster.status === 'connecting' || redisMaster.status === 'reconnecting'))
      || isRedisUnavailableErr(err)) {
      // pass
    } else {
      throw err;
    }
  }

  if (args?.destroy !== false) {
    try {
      await deleteDockerCompose();
    } catch (err) {
      if (lock) {
        await lock.release();
      }
      throw err;
    }
  }

  return initInfraWrap(async () => {
    if (args?.destroy !== false) {
      await startDockerCompose();
      await destroyMVInfra();
      await dropDbs();
    }
    await restorePgdump();
    await initRR();
    await seedDb();
    await initMVInfra();
  });
}
