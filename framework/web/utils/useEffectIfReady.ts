export default function useEffectIfReady(
  // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
  cb: Function,
  deps: StableDependencyList,
  isReady: boolean,
): void {
  useEffect(() => {
    if (!isReady) {
      return undefined;
    }
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    return cb();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, isReady]);
}
