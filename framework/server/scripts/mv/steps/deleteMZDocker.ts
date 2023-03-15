import exec from 'utils/exec';
import { APP_NAME_LOWER } from 'settings';

export default async function deleteMZDocker() {
  const startTime = performance.now();
  printDebug('Deleting MZ Docker volume', 'highlight');

  // docker inspect -f '{{ (index .Mounts 0).Name }}' materialize
  await exec(`yarn dc -p ${APP_NAME_LOWER} stop materialize`);
  await exec(`yarn dc -p ${APP_NAME_LOWER} rm -f -s materialize`);

  printDebug(`Deleted MZ Docker after ${Math.round((performance.now() - startTime) / 100) / 10}s`, 'success');
}
