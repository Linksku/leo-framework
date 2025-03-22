import { APP_NAME_LOWER } from 'config';
import exec from 'utils/exec';
import { HAS_MVS } from 'config/__generated__/consts';
import getExpectedDockerServices from './getExpectedDockerServices';

export default async function getDockerComposeStatus() {
  const { out, outMZ } = await promiseObj({
    out: exec(`yarn dc -p ${APP_NAME_LOWER} ps --format json`),
    outMZ: HAS_MVS
      ? exec(`yarn dc -p ${APP_NAME_LOWER} --profile mz ps --format json`)
      : undefined,
  });
  // https://github.com/docker/compose/pull/10918
  const parsed: any[] = out.stdout.startsWith('[')
    ? JSON.parse(out.stdout)
    : out.stdout.trim().split('\n').map(val => JSON.parse(val));
  if (outMZ) {
    const parsedMZ = outMZ.stdout.startsWith('[')
      ? JSON.parse(outMZ.stdout)
      : outMZ.stdout.trim().split('\n').map(val => JSON.parse(val));
    parsed.push(...parsedMZ);
  }

  const data = TS.assertType<{
    Service: string,
    State: 'created' | 'restarting' | 'running' | 'removing' | 'paused' | 'exited' | 'dead',
    Health: 'starting' | 'healthy' | 'unhealthy' | 'none' | '',
  }[]>(
    parsed,
    val => Array.isArray(val) && val.every(v => TS.isObj(v) && v.Service && v.State),
  );

  const expectedServices = new Set<string>(getExpectedDockerServices());
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
