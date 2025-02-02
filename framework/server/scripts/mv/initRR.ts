import initInfraWrap from 'utils/infra/initInfraWrap';
import { HAS_MVS } from 'config/__generated__/consts';
import createBTPublications from './steps/createBTPublications';
import createRRSubscription from './steps/createRRSubscription';

export default function initRR() {
  if (!HAS_MVS) {
    printDebug('RR not needed', 'highlight');
    return undefined;
  }

  return initInfraWrap(async () => {
    printDebug('Initializing RR', 'info');

    await withErrCtx(createBTPublications(), 'initRR: createBTPublications');
    await withErrCtx(createRRSubscription(), 'initRR: createRRSubscription');
  });
}
