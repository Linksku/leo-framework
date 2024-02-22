import exec from 'utils/exec';
import retry from 'utils/retry';
import { MZ_HOST, MZ_PORT } from 'consts/infra';
import { APP_NAME_LOWER } from 'config';
import initInfraWrap from 'utils/infra/initInfraWrap';

export default function restartMZ() {
  return initInfraWrap(async () => {
    printDebug('Restarting Materialize', 'info');

    await exec(`yarn dc -p ${APP_NAME_LOWER} --compatibility up -d materialize`);
    await exec(`yarn dc -p ${APP_NAME_LOWER} restart materialize`);

    await retry(
      async () => {
        const res = await fetch(`http://${MZ_HOST}:${MZ_PORT}/status`);
        if (res.status >= 400) {
          throw new Error(`MZ status ${res.status}`);
        }
      },
      {
        timeout: 5 * 60 * 1000,
        interval: 1000,
        ctx: 'restartMZ',
      },
    );
  });
}
