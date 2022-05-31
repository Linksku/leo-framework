import { ENABLE_DBZ } from 'consts/mz';
import destroyInfra from './destroyInfra';
import createBTPublications from './mz/steps/createBTPublications';
import initDBZ from './mz/initDBZ';
import initMZ from './mz/initMZ';
import initRR from './mz/initRR';

// todo: mid/mid add script to recreate single table
// todo: mid/hard allow model migrations
export default async function recreateMZ() {
  await destroyInfra();
  await pause(1000);

  await createBTPublications();
  await Promise.all([
    (async () => {
      if (ENABLE_DBZ) {
        await initDBZ();
      }
      await initMZ();
      printDebug('Done initializing MZ and DBZ', 'success');
    })(),
    (async () => {
      await initRR();
      printDebug('Done initializing RR', 'success');
    })(),
  ]);
}
