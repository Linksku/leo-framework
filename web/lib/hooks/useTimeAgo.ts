import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

const cache = Object.create(null) as ObjectOf<string>;

export default function useTimeAgo(time?: number | string | Date, includeAgo = true) {
  if (!time) {
    return null;
  }
  if (time instanceof Date) {
    time = time.getTime();
  }
  if (!cache[time]) {
    cache[time] = dayjs(time).fromNow(!includeAgo);
  }
  return cache[time];
}
