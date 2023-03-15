import exec from 'utils/exec';
import retry from 'utils/retry';
import { MZ_HOST, MZ_PORT } from 'consts/infra';
import { APP_NAME_LOWER } from 'settings';

export default async function startMZDocker() {
  const startTime = performance.now();

  try {
    const connector = await fetch(`http://${MZ_HOST}:${MZ_PORT}/status`);
    if (connector.status < 400) {
      printDebug('Materialize Docker already running', 'info');
      return;
    }
  } catch {}

  printDebug('Starting MZ Docker', 'info');
  await exec(`yarn dc -p ${APP_NAME_LOWER} --compatibility up -d materialize`);
  await exec(`yarn dc -p ${APP_NAME_LOWER} start materialize`);

  await retry(
    async () => {
      const connector = await fetch(`http://${MZ_HOST}:${MZ_PORT}/status`);
      if (connector.status >= 400) {
        throw new Error(`MZ unavailable: ${connector.status}`);
      }
    },
    {
      timeout: 60 * 1000,
      interval: 1000,
      ctx: 'startMZDocker',
    },
  );

  printDebug(`Started MZ Docker after ${Math.round((performance.now() - startTime) / 100) / 10}s`, 'success');
}
