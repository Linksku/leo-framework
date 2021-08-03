import useUpdatedState from 'lib/hooks/useUpdatedState';

export default function useEffectIfReady(
  cb: () => void,
  deps: MemoDependencyList,
  isReady: boolean,
) {
  const wasReady = useUpdatedState(false, s => s || isReady);

  useEffect(() => {
    if (!isReady) {
      return;
    }
    // eslint-disable-next-line consistent-return
    return cb();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, wasReady]);
}
