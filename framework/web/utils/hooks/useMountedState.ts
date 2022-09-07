export default function useMountedState(): Memoed<() => boolean> {
  const mountedRef = useRef<boolean>(false);
  const getMountedState = useCallback(() => mountedRef.current, []);

  // Runs before useEffect for both mount and unmount.
  useLayoutEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
    };
  }, []);

  return getMountedState;
}
