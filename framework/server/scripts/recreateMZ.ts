import redisFlushAll from 'utils/infra/redisFlushAll';
import destroyMZ from './mv/destroyMZ';
import initMZ from './mv/initMZ';

export default async function recreateMZ() {
  await destroyMZ();
  await redisFlushAll();
  await initMZ();
}
