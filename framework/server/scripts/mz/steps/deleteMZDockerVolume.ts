import childProcess from 'child_process';
import { promisify } from 'util';

export default async function deleteMZDockerVolume() {
  printDebug(`Deleting MZ Docker volume`, 'highlight');
  // docker inspect -f '{{ (index .Mounts 0).Name }}' materialize
  await promisify(childProcess.exec)('docker-compose rm -f -s materialize');
}
