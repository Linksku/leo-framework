import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

import memoize from 'utils/memoize';

dayjs.extend(relativeTime);

function useTimeAgo(time?: number, includeAgo = true) {
  if (!time) {
    return null;
  }

  const str = dayjs(
    // Fixes bug where sometimes "in a few seconds" is shown.
    Math.abs(performance.now() - time) < 10 * 1000
      ? undefined
      : time,
  )
    .fromNow(!includeAgo);

  if (str.startsWith('a few')) {
    return str;
  }
  if (str.startsWith('a ')) {
    return `1 ${str.slice(2)}`;
  }
  if (str.startsWith('an ')) {
    return `1 ${str.slice(3)}`;
  }
  return str;
}

export default memoize(useTimeAgo, 60 * 1000);
