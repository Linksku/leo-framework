import { useGetIsRouteActive } from 'stores/RouteStore';

export default function useEnterRoute(cb: Stable<() => () => void>) {
  const routeState = useRouteStore(true);
  const isRouteActive = routeState?.isRouteActive;
  const wasRouteActive = routeState?.wasRouteActive;
  const frozenCount = routeState?.frozenCount ?? 0;
  const prevFrozenCount = useRef(frozenCount);
  const getIsRouteActive = useGetIsRouteActive(true);

  const handleLeaveRoute = useRef<(() => void) | null>(null);
  // For rerender after loading route chunk
  const firstRunRef = useRef(true);

  useEffect(() => {
    if (isRouteActive !== false
      && (firstRunRef.current
        || wasRouteActive === false
        || prevFrozenCount.current !== frozenCount)) {
      firstRunRef.current = false;
      handleLeaveRoute.current = cb();
    } else if (wasRouteActive !== false && isRouteActive === false) {
      handleLeaveRoute.current?.();
      handleLeaveRoute.current = null;
    }

    prevFrozenCount.current = frozenCount;
  }, [isRouteActive, wasRouteActive, cb, frozenCount]);

  // useEffect won't run if the route is frozen, so setInterval is needed to run handleLeaveRoute
  const timerRef = useRef<number | null>(null);
  useEffect(() => {
    timerRef.current = window.setInterval(() => {
      if (getIsRouteActive?.() === false) {
        handleLeaveRoute.current?.();
        handleLeaveRoute.current = null;
        window.clearInterval(TS.notNull(timerRef.current));
      }
    }, 10_000);

    return () => {
      window.clearInterval(TS.notNull(timerRef.current));
    };
  }, [getIsRouteActive]);
}
