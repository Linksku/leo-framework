import exec from 'utils/exec';
import prompt from 'utils/prompt';
import { APP_NAME_LOWER } from 'config';

export default async function deleteDockerCompose() {
  const ans = await prompt(`Delete all ${APP_NAME_LOWER} Docker containers?`);
  if (ans.toLowerCase() !== 'y') {
    await ErrorLogger.flushAndExit(0);
  }

  printDebug('Deleting Docker containers', 'highlight');
  await exec(`yarn dc -p ${APP_NAME_LOWER} --profile mz down`, { stream: true });
  await exec(`yarn dc -p ${APP_NAME_LOWER} down`, { stream: true });
}
