import getTimeAgo from './getTimeAgo';
import useInterval from './useInterval';

export default function useTimeAgo(time: number): string {
  const [timeAgo, setTimeAgo] = React.useState(() => getTimeAgo(time));

  const interval = Date.now() - time > 60 * 60 * 1000 ? 60 * 60 * 1000 : 60 * 1000;
  useInterval(() => {
    setTimeAgo(getTimeAgo(time));
  }, interval);

  return timeAgo;
}
