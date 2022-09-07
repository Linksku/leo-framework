import usePrevious from 'utils/hooks/usePrevious';

export default function useEnterRoute(cb: Memoed<() => () => void>) {
  const { isRouteActive } = useRouteStore();
  const wasRouteActive = usePrevious(isRouteActive);
  const handleLeaveRoute = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (isRouteActive && !wasRouteActive) {
      handleLeaveRoute.current = cb();
    } else if (wasRouteActive && !isRouteActive) {
      handleLeaveRoute.current?.();
      handleLeaveRoute.current = null;
    }
  }, [isRouteActive, wasRouteActive, cb]);
}
