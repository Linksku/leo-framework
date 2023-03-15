import { APP_NAME_LOWER } from 'settings';
import exec from 'utils/exec';
import dockerCompose from '../../../../docker-compose';

export default async function getDockerComposeStatus() {
  const out = await exec(`yarn --silent dc -p ${APP_NAME_LOWER} ps --format json`);
  const data = TS.assertType<{ Service: string, State: string }[]>(
    JSON.parse(out.stdout),
    val => Array.isArray(val) && val.every(v => v.Service && v.State),
  );

  const expectedServices = new Set(
    Object.entries(dockerCompose)
      .filter(pair => !TS.hasProp(pair[1], 'profiles'))
      .map(pair => pair[0]),
  );
  const runningServices = new Set(
    data.filter(d => ['running', 'created', 'restarting'].includes(d.State))
      .map(d => d.Service),
  );
  const missingServices = [...expectedServices].filter(s => !runningServices.has(s));
  const extraServices = [...runningServices].filter(s => !expectedServices.has(s));

  return {
    data,
    missingServices,
    extraServices,
  };
}
