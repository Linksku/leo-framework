import usePrevious from 'hooks/usePrevious';

// Render everything else before running a slow function for display
export default function useMemoDeferred<T>(
  defaultValue: Memoed<T>,
  cb: Memoed<() => T>,
): Memoed<T> {
  const [value, setValue] = useState<T>(defaultValue);

  useEffect(() => {
    setValue(cb());
  }, [cb]);

  const prevCb = usePrevious(cb);
  return cb === prevCb ? value : defaultValue;
}
