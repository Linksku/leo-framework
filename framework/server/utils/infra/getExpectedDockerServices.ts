import { HAS_MVS } from 'config/__generated__/consts';
import dockerCompose from '../../../../docker-compose';

export default function getExpectedDockerServices() {
  return TS.objEntries(dockerCompose)
    .filter(pair => {
      const profiles = TS.getProp(pair[1], 'profiles');
      if (!profiles || !Array.isArray(profiles)) {
        return true;
      }
      if (HAS_MVS && profiles.includes('mz')) {
        return true;
      }
      return false;
    })
    .map(pair => pair[0]);
}
