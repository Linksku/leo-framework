import withErrCtx from 'utils/withErrCtx';
import initInfraWrap from 'utils/infra/initInfraWrap';
import createBTPublications from './steps/createBTPublications';
import createDBZReplicationSlots from './steps/createDBZReplicationSlots';
import createRRSubscription from './steps/createRRSubscription';
import initMZ from './initMZ';

export default function initMVInfra() {
  return initInfraWrap(async () => {
    await withErrCtx(createBTPublications(), 'initMVInfra: createBTPublications');
    await Promise.all([
      withErrCtx(createDBZReplicationSlots(), 'initMVInfra: createDBZReplicationSlots'),
      withErrCtx(createRRSubscription(), 'initMVInfra: createRRSubscription'),
    ]);

    await initMZ();
  });
}
