import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

import memoize from 'utils/memoize';

dayjs.extend(relativeTime);

function useTimeAgo(time?: number, includeAgo = true) {
  if (!time) {
    return null;
  }

  return dayjs(
    // Fixes bug where sometimes "in a few seconds" is shown.
    Math.abs(performance.now() - time) < 10 * 1000
      ? undefined
      : time,
  ).fromNow(!includeAgo);
}

export default memoize(useTimeAgo, 60 * 1000);
