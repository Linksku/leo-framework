import initInfraWrap from 'utils/infra/initInfraWrap';
import destroyMZ from './destroyMZ';
import destroyRR from './destroyRR';
import deleteBTPublications from './steps/deleteBTPublications';
import deleteDBZReplicationSlots from './steps/deleteDBZReplicationSlots';

// Note: may leave behind dangling topics, connectors, slots, etc.
export default async function destroyMVInfra() {
  await initInfraWrap(async () => {
    await Promise.all([
      (async () => {
        await destroyMZ({
          forceDeleteDBZConnectors: true,
          deleteMZSources: true,
          deleteMZSinkConnectors: true,
        });
        printDebug('Done destroying MZ and DBZ', 'success');
      })(),
      (async () => {
        await destroyRR();
        printDebug('Done destroying RR', 'success');
      })(),
    ]);

    await withErrCtx(deleteDBZReplicationSlots(), 'destroyMVInfra: deleteDBZReplicationSlots');
    await withErrCtx(deleteBTPublications(), 'destroyMVInfra: deleteBTPublications');
  });
  await pause(1000);
}
