import exec from 'utils/exec';

export default async function deleteMZDockerVolume() {
  printDebug('Deleting MZ Docker volume', 'highlight');
  // docker inspect -f '{{ (index .Mounts 0).Name }}' materialize
  await exec('docker compose rm -f -s materialize');
}
