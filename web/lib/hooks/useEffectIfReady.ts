export default function useEffectIfReady(
  cb: () => void,
  deps: any[],
  isReady: boolean,
) {
  const wasReady = useRef(false);

  wasReady.current = wasReady.current || isReady;

  useEffect(() => {
    if (!isReady) {
      return;
    }
    // eslint-disable-next-line consistent-return
    return cb();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, wasReady.current]);
}
