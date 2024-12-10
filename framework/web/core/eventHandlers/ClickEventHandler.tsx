import { ABSOLUTE_URL_REGEX } from 'consts/browsers';
import useWindowEvent from 'utils/useWindowEvent';

export default function ClickEventHandler() {
  const pushPath = usePushPath();

  useWindowEvent('click', useCallback((event: MouseEvent) => {
    const el = (event.target as HTMLElement).closest('a');
    const href = el?.getAttribute('href');

    if (!el || !href) {
      return;
    }

    if (!process.env.PRODUCTION) {
      throw new Error(`HistoryStore.handleClick: use <Link> instead of <a> for ${href}`);
    }

    if (href && !ABSOLUTE_URL_REGEX.test(href)) {
      event.preventDefault();

      pushPath(href);
    }
  }, [pushPath]));

  return null;
}
