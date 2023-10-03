export default function useEnterRoute(cb: Stable<() => () => void>) {
  let isRouteActive = null as boolean | null;
  let wasRouteActive = null as Nullish<boolean>;
  let frozenCount = 0;
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    ({ isRouteActive, wasRouteActive, frozenCount } = useRouteStore());
  } catch {}

  // Note: handleLeaveRoute isn't called if route is frozen
  const handleLeaveRoute = useRef<(() => void) | null>(null);
  // For rerender after loading route chunk
  const firstRunRef = useRef(true);

  useEffect(() => {
    if (isRouteActive !== false && (firstRunRef.current || wasRouteActive === false)) {
      firstRunRef.current = false;
      handleLeaveRoute.current = cb();
    } else if (wasRouteActive && !isRouteActive) {
      handleLeaveRoute.current?.();
      handleLeaveRoute.current = null;
    }
  }, [isRouteActive, wasRouteActive, cb, frozenCount]);
}
