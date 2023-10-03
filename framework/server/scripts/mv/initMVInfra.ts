import initInfraWrap from 'utils/infra/initInfraWrap';
import { ENABLE_DBZ } from 'consts/mz';
import createBTPublications from './steps/createBTPublications';
import createDBZReplicationSlots from './steps/createDBZReplicationSlots';
import createRRSubscription from './steps/createRRSubscription';
import initMZ from './initMZ';

export default function initMVInfra() {
  return initInfraWrap(async () => {
    await withErrCtx(createBTPublications(), 'initMVInfra: createBTPublications');
    await Promise.all([
      ENABLE_DBZ
        ? withErrCtx(createDBZReplicationSlots(), 'initMVInfra: createDBZReplicationSlots')
        : null,
      withErrCtx(createRRSubscription(), 'initMVInfra: createRRSubscription'),
    ]);

    await initMZ();
  });
}
