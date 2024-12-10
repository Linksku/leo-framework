import initInfraWrap from 'utils/infra/initInfraWrap';
import createBTPublications from './steps/createBTPublications';
import createDBZReplicationSlots from './steps/createDBZReplicationSlots';
import createRRSubscription from './steps/createRRSubscription';
import initMZ from './initMZ';

export default function initMVInfra(args?: Parameters<typeof initMZ>[0]) {
  return initInfraWrap(async () => {
    await Promise.all([
      withErrCtx(createBTPublications(), 'initMVInfra: createBTPublications'),
      withErrCtx(createDBZReplicationSlots(), 'initMVInfra: createDBZReplicationSlots'),
    ]);
    await withErrCtx(createRRSubscription(), 'initMVInfra: createRRSubscription');

    await initMZ(args);
  });
}
