import exec from 'utils/exec';
import retry from 'utils/retry';

const SERVICES_RUNNING = ['broker', 'connect', 'materialize', 'redis'];

export default async function startDockerCompose() {
  printDebug('Starting Docker Compose', 'highlight');
  await exec('docker compose up -d');

  let lastFailure = '';
  await retry(
    async () => {
      for (const service of SERVICES_RUNNING) {
        const out = await exec(`docker inspect -f {{.State.Health.Status}} ${service}`);
        const status = out.stdout.trim();
        if (status !== 'healthy') {
          lastFailure = `${service} is ${status}`;
          return false;
        }
      }
      return true;
    },
    {
      timeout: 2 * 60 * 1000,
      err: () => `initInfra: Docker not starting: ${lastFailure}`,
    },
  );
}
