import usePrevious from 'hooks/usePrevious';

// Render everything else before running a slow function for display
// Different from useDeferredValue for initial render
export default function useMemoDeferred<T>(
  defaultValue: Stable<T>,
  cb: Stable<() => T>,
): Stable<T> {
  const [value, setValue] = useState<T>(defaultValue);

  useEffect(() => {
    setValue(cb());
  }, [cb]);

  const prevCb = usePrevious(cb);
  return cb === prevCb ? value : defaultValue;
}
