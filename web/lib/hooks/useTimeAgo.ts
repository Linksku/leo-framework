import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

const CACHE_EXPIRY = 60 * 1000;

const cache = Object.create(null) as ObjectOf<{
  timeAgo: string,
  cacheTime: number,
}>;

export default function useTimeAgo(time?: number | Date, includeAgo = true) {
  if (!time) {
    return null;
  }
  if (time instanceof Date) {
    time = time.getTime();
  }

  let cached = cache[time];
  // Fixes bug where sometimes "in a few seconds" is shown.
  if (!cached && Math.abs(Date.now() - time) < 10 * 1000) {
    cached = cache[time] = {
      timeAgo: dayjs().fromNow(!includeAgo),
      cacheTime: Date.now(),
    };
  } else if (!cached || Date.now() - cached.cacheTime > CACHE_EXPIRY) {
    cached = cache[time] = {
      timeAgo: dayjs(time).fromNow(!includeAgo),
      cacheTime: Date.now(),
    };
  }
  return cached.timeAgo;
}
