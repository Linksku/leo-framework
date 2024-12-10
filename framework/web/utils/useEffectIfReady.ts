export default function useEffectIfReady(
  // eslint-disable-next-line @typescript-eslint/ban-types
  cb: Function,
  deps: StableDependencyList,
  isReady: boolean,
): void {
  useEffect(() => {
    if (!isReady) {
      return undefined;
    }
    return cb();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, isReady]);
}
