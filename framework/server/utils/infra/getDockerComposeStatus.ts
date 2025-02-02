import { APP_NAME_LOWER } from 'config';
import exec from 'utils/exec';
import dockerCompose from '../../../../docker-compose';

// todo: high/easy handle mz profile
export default async function getDockerComposeStatus() {
  const out = await exec(`yarn dc -p ${APP_NAME_LOWER} ps --format json`);
  // https://github.com/docker/compose/pull/10918
  const parsed = out.stdout.startsWith('[')
    ? JSON.parse(out.stdout)
    : out.stdout.trim().split('\n').map(val => JSON.parse(val));
  const data = TS.assertType<{
    Service: string,
    State: 'created' | 'restarting' | 'running' | 'removing' | 'paused' | 'exited' | 'dead',
    Health: 'starting' | 'healthy' | 'unhealthy' | 'none' | '',
  }[]>(
    parsed,
    val => Array.isArray(val) && val.every(v => TS.isObj(v) && v.Service && v.State),
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
  const unhealthyServices = data.filter(d => d.Health !== 'healthy' && d.Health !== '')
    .map(d => d.Service);

  return {
    data,
    missingServices,
    extraServices,
    unhealthyServices,
  };
}
