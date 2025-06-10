import type { Arguments } from 'yargs';

import prompt from 'utils/prompt';
import exec from 'utils/exec';
import redisFlushAll from 'utils/infra/redisFlushAll';
import initInfraWrap from 'utils/infra/initInfraWrap';
import { APP_NAME_LOWER } from 'config';
import destroyMVInfra from './mv/destroyMVInfra';
import initMVInfra from './mv/initMVInfra';
import checkPendingMigrations from './mv/steps/checkPendingMigrations';

export default async function recreateMVInfra(args?: Arguments<{
  f: boolean,
  waitForComplete: boolean,
}>) {
  if (process.env.SERVER === 'production') {
    await checkPendingMigrations();

    if (process.env.IS_SERVER_SCRIPT && !process.env.SERVER_SCRIPT_PATH?.includes('monitorInfra')) {
      await exec(`yarn dc -p ${APP_NAME_LOWER} stop server monitor-infra`);
    }
  }

  await initInfraWrap(async () => {
    if (process.env.IS_SERVER_SCRIPT
      && process.env.SERVER_SCRIPT_PATH?.includes('recreateMVInfra')
      && !args?.f) {
      const ans = await prompt('Delete all publications, connectors, and replica data?');
      if (ans.toLowerCase() !== 'y') {
        await ErrorLogger.flushAndExit(0);
      }
    }

    await destroyMVInfra();
  });
  await redisFlushAll();
  // todo: low/med maybe `docker down` in case not everything is destroyed
  printDebug('Destroyed MV infra', 'success');

  await initInfraWrap(async () => {
    await initMVInfra({ waitForComplete: args?.waitForComplete });
  });
}
