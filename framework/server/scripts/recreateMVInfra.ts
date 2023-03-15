import prompt from 'utils/prompt';
import redisFlushAll from 'utils/infra/redisFlushAll';
import initInfraWrap from 'utils/infra/initInfraWrap';
import destroyMVInfra from './mv/destroyMVInfra';
import initMVInfra from './mv/initMVInfra';

// todo: mid/hard instead of recreating everything, update only downstream from changed MVs
export default async function recreateMVInfra() {
  await initInfraWrap(async () => {
    const ans = await prompt('Delete all publications, connectors, and replica data?');
    if (ans.toLowerCase() !== 'y') {
      await ErrorLogger.flushAndExit(0);
    }

    await destroyMVInfra();
  });
  await redisFlushAll();
  // todo: low/mid maybe `docker down` in case not everything is destroyed
  printDebug('Destroyed MV infra', 'debug');

  await initInfraWrap(async () => {
    await initMVInfra();
  });
}
