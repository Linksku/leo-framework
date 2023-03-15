import exec from 'utils/exec';
import prompt from 'utils/prompt';
import { APP_NAME_LOWER } from 'settings';

export default async function destroyDockerCompose() {
  const ans = await prompt('Destroy all Docker containers?');
  if (ans.toLowerCase() !== 'y') {
    await ErrorLogger.flushAndExit(0);
  }

  printDebug('Destroying Docker containers', 'highlight');
  await exec(`yarn dc -p ${APP_NAME_LOWER} down`, { stream: true });
}
