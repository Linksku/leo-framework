export default function useEffectIfReady(
  cb: AnyFunction,
  deps: MemoDependencyList,
  isReady: boolean,
) {
  useEffect(() => {
    if (!isReady) {
      return undefined;
    }
    return cb();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, isReady]);
}
