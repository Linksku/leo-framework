import redisFlushAll from 'utils/infra/redisFlushAll';
import { MODEL_NAMESPACES } from 'consts/coreRedisNamespaces';
import initInfraWrap from 'utils/infra/initInfraWrap';
import { APP_NAME_LOWER } from 'settings';
import exec from 'utils/exec';
import destroyMZ from './mv/destroyMZ';
import initMZ from './mv/initMZ';
import startDockerCompose from './mv/steps/startDockerCompose';

// yarn ss recreateMZ --restartKafka --forceDeleteDBZConnectors --deleteMZSources --deleteMZSinkConnectors
export default function recreateMZ({ recreateKafka, ...args }: {
  recreateKafka?: boolean,
} & Parameters<typeof destroyMZ>[0] = {}) {
  return initInfraWrap(async () => {
    await destroyMZ(args);
    await redisFlushAll(MODEL_NAMESPACES);

    if (recreateKafka) {
      printDebug('Recreating Kafka containers', 'info');
      await exec(`yarn dc -p ${APP_NAME_LOWER} --compatibility rm -f -s -v broker connect schema-registry`);
      await startDockerCompose();
    }

    await initMZ();
  });
}
