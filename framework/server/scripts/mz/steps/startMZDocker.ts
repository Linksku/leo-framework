import childProcess from 'child_process';
import { promisify } from 'util';

import retry from 'utils/retry';

export default async function startMZDocker() {
  printDebug(`Starting MZ Docker`, 'highlight');
  await promisify(childProcess.exec)('docker-compose up -d materialize && docker-compose start materialize');

  await retry(
    async () => {
      const connector = await fetch(`http://${process.env.MZ_HOST}:${process.env.MZ_PORT}/status`);
      return connector.status < 400;
    },
    {
      times: 10,
      interval: 1000,
      timeoutErr: 'startMZDocker: MZ not ready.',
    },
  );
}
