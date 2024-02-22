import exec from 'utils/exec';
import { APP_NAME_LOWER } from 'config';

export default async function deleteMZDocker() {
  const startTime = performance.now();
  printDebug('Deleting MZ Docker volume', 'highlight');

  // docker inspect -f '{{ (index .Mounts 0).Name }}' $(yarn dc ps -q materialize)
  await exec(`yarn dc -p ${APP_NAME_LOWER} rm -f -s -v materialize`);

  printDebug(
    `Deleted MZ Docker after ${Math.round((performance.now() - startTime) / 100) / 10}s`,
    'success',
  );
}
