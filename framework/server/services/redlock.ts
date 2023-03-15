import Redlock from 'redlock';

import { redisMaster } from './redis';

export default new Redlock(
  [redisMaster],
  {
    retryCount: 1,
  },
);
