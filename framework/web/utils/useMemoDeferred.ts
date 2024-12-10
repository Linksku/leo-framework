// Render everything else before running a slow function for display
// Different from useDeferredValue for initial render
export default function useMemoDeferred<T>(
  initialValue: Stable<T>,
  cb: Stable<() => T>,
): Stable<T> {
  const [memoedValue, setMemoedValue] = useState<T>(initialValue);

  useEffect(() => {
    setMemoedValue(cb());
  }, [cb]);

  return memoedValue as Stable<T>;
}
