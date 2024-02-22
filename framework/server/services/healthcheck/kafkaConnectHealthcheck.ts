import exec from 'utils/exec';
import { APP_NAME_LOWER } from 'config';
import { addHealthcheck } from './HealthcheckManager';

addHealthcheck('kafkaConnect', {
  cb: async function kafkaConnectHealthcheck() {
    let errors: string[];
    try {
      const out = await exec(`docker logs $(yarn dc -p ${APP_NAME_LOWER} ps -q connect) --since 1m -n 100 | grep ERROR`);
      errors = out.stdout.trim().split('\n');
    } catch {
      return;
    }

    let lastErr = errors.at(-1);
    if (!lastErr) {
      return;
    }

    lastErr = lastErr.split('ERROR').at(-1).trim();
    lastErr = lastErr.replace(/^[\s:]+/, '');
    throw new Error(`kafkaConnectHealthcheck: ${lastErr}`);
  },
  resourceUsage: 'mid',
  usesResource: 'docker',
  stability: 'mid',
  timeout: 10 * 1000,
});
