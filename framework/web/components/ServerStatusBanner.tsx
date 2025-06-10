import WifiSlashSvg from 'svgs/fa5/regular/wifi-slash.svg';

import InfoBanner from 'components/InfoBanner';
import useIsServerHealthy from 'core/useIsServerHealthy';

export default function ServerStatusBanner() {
  const isServerHealthy = useIsServerHealthy();

  return isServerHealthy === false
    ? (
      <InfoBanner
        LeftSvg={WifiSlashSvg}
        msg="The server is experiencing temporary problems, some actions may fail."
        isWarning
      />
    )
    : null;
}
