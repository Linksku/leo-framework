import redisFlushAll from 'utils/infra/redisFlushAll';
import { MODEL_NAMESPACES } from 'consts/coreRedisNamespaces';
import initInfraWrap from 'utils/infra/initInfraWrap';
import destroyMZ from './mv/destroyMZ';
import initMZ from './mv/initMZ';

export default function recreateMZ(args?: Parameters<typeof destroyMZ>[0]) {
  return initInfraWrap(async () => {
    await destroyMZ(args);
    await redisFlushAll(MODEL_NAMESPACES);
    await initMZ();
  });
}
