export default function useEnterRoute(cb: Memoed<() => () => void>) {
  const { isRouteActive, wasRouteActive, frozenCount } = useRouteStore();
  // Note: handleLeaveRoute isn't called if route is frozen
  const handleLeaveRoute = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (isRouteActive && !wasRouteActive) {
      handleLeaveRoute.current = cb();
    } else if (wasRouteActive && !isRouteActive) {
      handleLeaveRoute.current?.();
      handleLeaveRoute.current = null;
    }
  }, [isRouteActive, wasRouteActive, cb, frozenCount]);
}
