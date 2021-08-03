function setItem(key: string, val: any, raw?: boolean) {
  try {
    window.localStorage.setItem(
      key,
      raw ? (val as unknown as string) : JSON.stringify(val),
    );
  } catch {}
}

export default function useLocalStorage<T>(
  key: string,
  initialVal: Memoed<T>,
  opts?: { raw: boolean },
) {
  if (process.env.NODE_ENV !== 'production' && opts?.raw && typeof initialVal !== 'string') {
    throw new Error('useLocalStorage raw initialVal must be string.');
  }

  const [state, setState] = useGlobalState<T>(`useLocalStorage:${key}`, () => {
    try {
      const val = window.localStorage.getItem(key);
      if (val) {
        return opts?.raw ? val : JSON.parse(val);
      }
    } catch {}

    setItem(key, initialVal, opts?.raw);
    return initialVal;
  });

  const setValue: Memoed<SetState<T>> = useCallback(val => {
    setState(s => {
      const newState = val instanceof Function ? val(s) : val;
      setItem(key, newState, opts?.raw);
      return newState;
    });
  }, [key, opts?.raw, setState]);

  const resetValue = useCallback(() => {
    setItem(key, initialVal, opts?.raw);
    setState(initialVal);
  }, [key, setState, initialVal, opts?.raw]);

  return [state, setValue, resetValue] as const;
}
