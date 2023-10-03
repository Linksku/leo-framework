export default function useGetIsMounted(): Stable<() => boolean> {
  const mountedRef = useRef<boolean>(false);

  // Runs before useEffect for both mount and unmount.
  useLayoutEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
    };
  }, []);

  return useCallback(() => mountedRef.current, []);
}
