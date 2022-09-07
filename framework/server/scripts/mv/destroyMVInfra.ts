import redisFlushAll from 'utils/infra/redisFlushAll';
import destroyMZ from './destroyMZ';
import destroyRR from './destroyRR';
import deleteBTPublications from './steps/deleteBTPublications';
import deleteDBZReplicationSlots from './steps/deleteDBZReplicationSlots';
import deleteSchemaRegistry from './steps/deleteSchemaRegistry';

export default async function destroyMVInfra() {
  await Promise.all([
    (async () => {
      await destroyMZ();
      printDebug('Done destroying MZ and DBZ', 'success');
    })(),
    (async () => {
      await destroyRR();
      printDebug('Done destroying RR', 'success');
    })(),
  ]);

  await Promise.all([
    redisFlushAll(),
    deleteSchemaRegistry(),
    (async () => {
      await deleteDBZReplicationSlots();
      await deleteBTPublications();
    })(),
  ]);
}
