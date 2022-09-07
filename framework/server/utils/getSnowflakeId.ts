import Flake from 'flake-idgen';

import getServerId from 'utils/getServerId';

const flake = new Flake({
  datacenter: 0,
  worker: getServerId(),
});

export default function getSnowflakeId(): string {
  return flake.next().toString('hex');
}