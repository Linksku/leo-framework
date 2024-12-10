export default function useGetIsFirstRender(): Stable<() => boolean> {
  const ref = useRef(true);

  useEffect(() => {
    ref.current = false;
  }, []);

  return useCallback(() => ref.current, []);
}
