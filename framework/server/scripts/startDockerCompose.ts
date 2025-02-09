import semver from 'semver';

import exec from 'utils/exec';
import retry from 'utils/retry';
import { APP_NAME_LOWER } from 'config';
import initInfraWrap from 'utils/infra/initInfraWrap';
import throttledPromiseAll from 'utils/throttledPromiseAll';
import safeParseJson from 'utils/safeParseJson';
import { HAS_MVS } from 'config/__generated__/consts';
import getExpectedDockerServices from 'utils/infra/getExpectedDockerServices';
import dockerCompose from '../../../docker-compose';

async function getDockerComposeVersion() {
  try {
    const dcVersionRaw = await exec(`yarn dc -p ${APP_NAME_LOWER} version`);
    const dcVersionMatch = dcVersionRaw.stdout.match(/v(\d+\.\d+\.\d+)/);
    return dcVersionMatch && semver.coerce(dcVersionMatch[1]);
  } catch {
    return null;
  }
}

async function getPrevDockerComposeVersion() {
  try {
    const prevDcVersionRaw = await exec(
      `docker inspect $(yarn dc -p ${APP_NAME_LOWER} ps -q broker) -f '{{json .Config.Labels}}'`,
    );
    const prevDcVersionObj = safeParseJson(prevDcVersionRaw.stdout);
    return TS.isObj(prevDcVersionObj)
      ? semver.coerce(prevDcVersionObj['com.docker.compose.version'])
      : null;
  } catch {
    return null;
  }
}

export async function waitForDockerHealthy() {
  const remainingServices = new Set(getExpectedDockerServices());
  await retry(
    async () => {
      await throttledPromiseAll(5, remainingServices, async service => {
        if (TS.hasProp(TS.defined(dockerCompose[service]), 'healthcheck')) {
          const out = await exec(`docker inspect -f {{.State.Health.Status}} $(yarn dc -p ${APP_NAME_LOWER} ps -q ${service})`);
          const status = out.stdout.trim();
          if (status !== 'healthy') {
            throw new Error(`${service} is ${status}`);
          }
        } else {
          const out = await exec(`docker inspect -f {{.State.Status}} $(yarn dc -p ${APP_NAME_LOWER} ps -q ${service})`);
          const status = out.stdout.trim();
          if (status !== 'running') {
            throw new Error(`${service} is ${status}`);
          }
        }
        remainingServices.delete(service);
      });
    },
    {
      timeout: 5 * 60 * 1000,
      interval: 10 * 1000,
      ctx: 'waitForDockerHealthy',
    },
  );
}

export default function startDockerCompose({ allowRecreate }: {
  allowRecreate?: boolean,
} = {}) {
  return initInfraWrap(async () => {
    const startTime = performance.now();
    printDebug('Starting Docker Compose', 'highlight');

    const { dcVersion, prevDcVersion } = await promiseObj({
      dcVersion: getDockerComposeVersion(),
      prevDcVersion: getPrevDockerComposeVersion(),
    });

    if (!dcVersion) {
      throw new Error('startDockerCompose: failed to get Docker Compose version');
    }
    if (prevDcVersion && semver.lt(dcVersion, prevDcVersion)) {
      throw new Error(`startDockerCompose: expected Docker Compose v${dcVersion}`);
    }

    allowRecreate ??= !process.env.IS_DOCKER && !process.env.IS_SERVER_SCRIPT;

    const cmd = allowRecreate
      // Might stop the script that's running this function, e.g. monitorInfra
      ? `yarn dc -p ${APP_NAME_LOWER} --compatibility up -d --remove-orphans`
      : `yarn dc -p ${APP_NAME_LOWER} --compatibility up -d --remove-orphans --no-recreate`;
    await exec(cmd, { stream: true });

    if (HAS_MVS) {
      const cmd2 = allowRecreate
        // Might stop the script that's running this function, e.g. monitorInfra
        ? `yarn dc -p ${APP_NAME_LOWER} --profile mz --compatibility up -d --remove-orphans`
        : `yarn dc -p ${APP_NAME_LOWER} --profile mz --compatibility up -d --remove-orphans --no-recreate`;
      await exec(cmd2, { stream: true });
    }

    await waitForDockerHealthy();

    printDebug(
      `Started Docker Compose after ${Math.round((performance.now() - startTime) / 100) / 10}s`,
      'success',
    );
  });
}
