import createBTPublications from './steps/createBTPublications';
import createDBZReplicationSlots from './steps/createDBZReplicationSlots';
import createRRSubscription from './steps/createRRSubscription';
import initMZ from './initMZ';

export default async function initMVInfra() {
  await createBTPublications();
  await Promise.all([
    createDBZReplicationSlots(),
    createRRSubscription(),
  ]);

  await initMZ();
}
