import { APP_NAME } from 'config/config';
import { useIsRouteActive } from 'stores/RouteStore';

export default function DocumentTitle({ title }: { title: string }) {
  const isRouteActive = useIsRouteActive();

  useEffect(() => {
    if (isRouteActive) {
      document.title = title === APP_NAME || !title
        ? APP_NAME
        : `${title} · ${APP_NAME}`;
    }
  }, [isRouteActive, title]);

  return null;
}
