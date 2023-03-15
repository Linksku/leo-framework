import withErrCtx from 'utils/withErrCtx';
import initInfraWrap from 'utils/infra/initInfraWrap';
import createBTPublications from './steps/createBTPublications';
import createRRSubscription from './steps/createRRSubscription';

export default function initRR() {
  return initInfraWrap(async () => {
    printDebug('Initializing RR', 'info');

    await withErrCtx(createBTPublications(), 'initRR: createBTPublications');
    await withErrCtx(createRRSubscription(), 'initRR: createRRSubscription');
  });
}
