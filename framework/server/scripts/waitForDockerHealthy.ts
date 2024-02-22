import getDockerComposeStatus from 'utils/infra/getDockerComposeStatus';
import retry from 'utils/retry';

export default async function waitForDockerHealthy() {
  await retry(
    async () => {
      const { missingServices, unhealthyServices } = await getDockerComposeStatus();
      if (missingServices.length) {
        throw getErr('Missing services', { missingServices });
      }
      if (unhealthyServices.length) {
        throw getErr('Unhealthy services', { unhealthyServices });
      }
    },
    {
      timeout: 5 * 60 * 1000,
      interval: 10 * 1000,
      ctx: 'waitForDockerHealthy',
    },
  );

  printDebug('Docker healthy', 'success');
}
