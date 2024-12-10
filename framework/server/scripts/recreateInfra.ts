import redlock from 'services/redis/redlock';
import { INIT_INFRA_LOCK_NAME, INIT_INFRA_LOCK_TTL, INIT_INFRA_REDIS_KEY } from 'consts/infra';
import { seedDb } from 'config/functions';
import { redisMaster } from 'services/redis';
import initInfraWrap from 'utils/infra/initInfraWrap';
import startDockerCompose from 'scripts/startDockerCompose';
import deleteDockerCompose from './mv/steps/deleteDockerCompose';
import destroyMVInfra from './mv/destroyMVInfra';
import resetDb from './db/resetDb';
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
export default async function recreateInfra() {
  const lock = await redlock.acquire([INIT_INFRA_LOCK_NAME], INIT_INFRA_LOCK_TTL);
  await redisMaster.setex(INIT_INFRA_REDIS_KEY, INIT_INFRA_LOCK_TTL / 1000, '1');
  try {
    await deleteDockerCompose();
  } catch (err) {
    await lock.release();
    throw err;
  }

  return initInfraWrap(async () => {
    await startDockerCompose();
    await destroyMVInfra();
    await resetDb();
    await restorePgdump();
    await initRR();
    await seedDb();
    await initMVInfra();
  });
}
