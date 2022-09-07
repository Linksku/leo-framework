import exec from 'utils/exec';
import prompt from 'utils/prompt';

export default async function destroyDockerCompose() {
  const ans = await prompt('Destroy all Docker containers?');
  if (ans.toLowerCase() !== 'y') {
    process.exit(0);
  }

  printDebug('Destroying Docker containers', 'highlight');
  await exec('docker compose down');
}
