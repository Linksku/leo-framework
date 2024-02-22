import initInfraWrap from 'utils/infra/initInfraWrap';
import destroyMZ from './destroyMZ';
import destroyRR from './destroyRR';
import deleteBTPublications from './steps/deleteBTPublications';

// Note: may leave behind dangling topics, connectors, slots, etc.
export default async function destroyMVInfra() {
  printDebug('Destroying MV infra', 'info');

  await initInfraWrap(async () => {
    await Promise.all([
      (async () => {
        await destroyMZ({
          deleteRRMVData: true,
          deleteMZSinkConnectors: true,
          deleteMZSources: true,
          forceDeleteDBZConnectors: true,
          deleteMZReplicationSlots: true,
        });
        printDebug('Done destroying MZ and DBZ', 'success');
      })(),
      (async () => {
        await destroyRR();
        printDebug('Done destroying RR', 'success');
      })(),
    ]);

    await withErrCtx(deleteBTPublications(), 'destroyMVInfra: deleteBTPublications');
  });
  await pause(1000);
}
