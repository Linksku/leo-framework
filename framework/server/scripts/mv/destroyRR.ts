import initInfraWrap from 'utils/infra/initInfraWrap';
import deleteRRSubscriptions from './steps/deleteRRSubscriptions';
import deleteRRData from './steps/deleteRRData';

export default function destroyRR() {
  return initInfraWrap(async () => {
    await withErrCtx(deleteRRSubscriptions(), 'destroyRR: deleteRRSubscriptions');
    await withErrCtx(deleteRRData(), 'destroyRR: deleteRRData');
  });
}
