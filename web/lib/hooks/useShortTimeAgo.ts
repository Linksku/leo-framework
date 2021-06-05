import relativeTime from 'dayjs/plugin/relativeTime';

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

const cache = Object.create(null) as ObjectOf<string>;

export default function useShortTimeAgo(time?: number | string) {
  if (!time) {
    return null;
  }
  if (!cache[time]) {
    cache[time] = dayjs(time).locale('useShortTimeAgo').fromNow(true);
  }
  return cache[time];
}
