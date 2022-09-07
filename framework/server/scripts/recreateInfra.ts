import seedDb from 'scripts/seedDb';
import destroyDockerCompose from './mv/steps/destroyDockerCompose';
import startDockerCompose from './mv/steps/startDockerCompose';
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

// todo: mid/mid add script to recreate single table
export default async function recreateInfra() {
  await destroyDockerCompose();
  await startDockerCompose();
  await destroyMVInfra();
  await resetDb();
  await restorePgdump();
  await initRR();
  await seedDb();
  await initMVInfra();
}
