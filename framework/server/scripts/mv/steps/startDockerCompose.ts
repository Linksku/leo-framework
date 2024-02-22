import exec from 'utils/exec';
import retry from 'utils/retry';
import { APP_NAME_LOWER } from 'config';
import initInfraWrap from 'utils/infra/initInfraWrap';
import dockerCompose from '../../../../../docker-compose';

export default function startDockerCompose(allowRecreate = false) {
  return initInfraWrap(async () => {
    printDebug('Starting Docker Compose', 'highlight');
    const cmd = allowRecreate && !process.env.IS_DOCKER
      // Might stop the script that's running this function, e.g. monitorInfra
      ? `yarn dc -p ${APP_NAME_LOWER} --compatibility up -d --remove-orphans`
      : `yarn dc -p ${APP_NAME_LOWER} --compatibility up -d --remove-orphans --no-recreate`;
    await exec(cmd, { stream: true });

    const remainingServices = new Set(
      TS.objEntries(dockerCompose)
        .filter(pair => !TS.hasProp(pair[1], 'profiles'))
        .map(pair => pair[0]),
    );
    await retry(
      async () => {
        for (const service of remainingServices) {
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
        }
      },
      {
        timeout: 2 * 60 * 1000,
        ctx: 'startDockerCompose',
      },
    );
  });
}
