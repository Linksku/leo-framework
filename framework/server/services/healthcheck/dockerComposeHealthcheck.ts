import getDockerComposeStatus from 'utils/infra/getDockerComposeStatus';
import { addHealthcheck } from './HealthcheckManager';

addHealthcheck('dockerCompose', {
  cb: async function dockerComposeHealthcheck() {
    const { missingServices, unhealthyServices } = await getDockerComposeStatus();
    if (missingServices.length) {
      throw getErr('Missing services', { missingServices });
    }
    if (unhealthyServices.length) {
      throw getErr('Unhealthy services', { unhealthyServices });
    }
  },
  // Server containers don't have access to Docker
  onlyForScript: true,
  resourceUsage: 'low',
  usesResource: 'docker',
  stability: 'high',
  timeout: 10 * 1000,
});
