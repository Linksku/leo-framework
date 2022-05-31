import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

import memoize from 'utils/memoize';

dayjs.extend(relativeTime);

dayjs.locale('useShortTimeAgo', {
  relativeTime: {
    future: '1m',
    past: '%s ago',
    s: '1m',
    m: '1m',
    mm: '%dm',
    h: '1h',
    hh: '%dh',
    d: '1d',
    dd: '%dd',
    M: '1m',
    MM: '%dm',
    y: '1y',
    yy: '%dy',
  },
}, true);

function useShortTimeAgo(time?: number) {
  if (!time) {
    return null;
  }

  return dayjs(
    // Fixes bug where sometimes "in a few seconds" is shown.
    Math.abs(performance.now() - time) < 10 * 1000
      ? undefined
      : time,
  ).locale('useShortTimeAgo').fromNow(true);
}

export default memoize(useShortTimeAgo, 60 * 1000);
