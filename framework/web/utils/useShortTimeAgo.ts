import getShortTimeAgo from './getShortTimeAgo';
import useInterval from './useInterval';

export default function useShortTimeAgo(time: number): string {
  const [timeAgo, setTimeAgo] = React.useState(() => getShortTimeAgo(time));

  const interval = Date.now() - time > 60 * 60 * 1000 ? 60 * 60 * 1000 : 60 * 1000;
  useInterval(() => {
    setTimeAgo(getShortTimeAgo(time));
  }, interval);

  return timeAgo;
}
