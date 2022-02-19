import useEffectIfReady from 'lib/hooks/useEffectIfReady';

export default function useAsync(
  fn: () => any,
  deps = [],
  isReady = true,
) {
  const [state, setState] = useState<{
    loading: boolean,
    results: any,
    error: Error | null,
  }>({
    loading: true,
    results: null,
    error: null,
  });

  useEffectIfReady(() => {
    let isCancelled = false;

    const promise = fn();
    if (!promise?.then) {
      setState(s => ({ ...s, results: promise, loading: false }));
      return;
    }

    promise
      .then(
        (results: any) => {
          if (!isCancelled) {
            setState(s => ({ ...s, results, loading: false }));
          }
        },
        (error: Error) => {
          // eslint-disable-next-line no-console
          console.log(error);
          if (!isCancelled) {
            setState(s => ({ ...s, error, loading: false }));
          }
        },
      );

    // eslint-disable-next-line consistent-return
    return () => {
      isCancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps, isReady);

  return state;
}
