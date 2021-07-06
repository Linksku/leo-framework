export default function useLocalStorage<T>(
  key: string,
  initialVal: T | null,
  opts?: { raw: boolean },
): [Memoed<T> | null, (val: T) => void, () => void] {
  if (process.env.NODE_ENV !== 'production' && opts?.raw && typeof initialVal !== 'string') {
    throw new Error('useLocalStorage raw initialVal must be string.');
  }

  const [state, setState] = useGlobalState<T | null>(`useLocalStorage:${key}`, () => {
    try {
      const val = window.localStorage.getItem(key);
      if (val) {
        return opts?.raw ? val : JSON.parse(val);
      }
      if (initialVal) {
        window.localStorage.setItem(
          key,
          opts?.raw ? (initialVal as unknown as string) : JSON.stringify(initialVal),
        );
      }
    } catch {}
    return initialVal;
  });

  const setValue = useCallback((val: T) => {
    try {
      window.localStorage.setItem(
        key,
        opts?.raw ? val as unknown as string : JSON.stringify(val),
      );
    } catch {}
    setState(val);
  }, [key, opts?.raw, setState]);

  const removeValue = useCallback(() => {
    try {
      window.localStorage.removeItem(key);
    } catch {}
    setState(null);
  }, [key, setState]);

  return [state, setValue, removeValue];
}
