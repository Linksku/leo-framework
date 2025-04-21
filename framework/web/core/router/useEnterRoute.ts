import { useGetIsRouteActive } from 'stores/RouteStore';
import usePrevious from 'utils/usePrevious';

export default function useEnterRoute(cb: Stable<() => () => void>) {
  const routeState = useRouteStore(true);
  const isRouteActive = routeState?.isRouteActive;
  const wasRouteActive = routeState?.wasRouteActive;
  const frozenCount = routeState?.frozenCount ?? 0;
  const prevFrozenCount = usePrevious(frozenCount);
  const getIsRouteActive = useGetIsRouteActive(true);

  const handleLeaveRoute = useRef<(() => void) | null>(null);
  const prevCb = usePrevious(cb);
  // For rerender after loading route chunk
  const firstRunRef = useRef(true);

  useEffect(() => {
    if (isRouteActive !== false) {
      if (firstRunRef.current
        || wasRouteActive === false
        || prevFrozenCount !== frozenCount) {
        firstRunRef.current = false;
        handleLeaveRoute.current = cb();
      } else if (cb !== prevCb && handleLeaveRoute.current) {
        handleLeaveRoute.current();
        handleLeaveRoute.current = cb();
      }
    } else if (wasRouteActive !== false && isRouteActive === false) {
      handleLeaveRoute.current?.();
      handleLeaveRoute.current = null;
    }

    return () => {
      if (getIsRouteActive?.() === false) {
        handleLeaveRoute.current?.();
        handleLeaveRoute.current = null;
      }
    };
  }, [
    isRouteActive,
    wasRouteActive,
    getIsRouteActive,
    prevFrozenCount,
    frozenCount,
    cb,
    prevCb,
  ]);

  // // useEffect won't run if the route is frozen, so setInterval is needed to run handleLeaveRoute
  // const timerRef = useRef<number | null>(null);
  // useEffect(() => {
  //   timerRef.current = window.setInterval(() => {
  //     if (getIsRouteActive?.() === false) {
  //       handleLeaveRoute.current?.();
  //       handleLeaveRoute.current = null;
  //       window.clearInterval(TS.notNull(timerRef.current));
  //     }
  //   }, 10_000);

  //   return () => {
  //     window.clearInterval(TS.notNull(timerRef.current));
  //   };
  // }, [getIsRouteActive]);
}
