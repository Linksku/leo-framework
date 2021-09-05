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
  validator: Memoed<(val: unknown) => boolean>,
  opts?: { raw: boolean },
) {
  if (process.env.NODE_ENV !== 'production') {
    if (opts?.raw && typeof initialVal !== 'string') {
      throw new Error('useLocalStorage: raw initialVal must be string.');
    }
    if (!validator(initialVal)) {
      throw new Error('useLocalStorage: initialVal failed validator.');
    }
  }

  const [state, setState] = useGlobalState<T>(`useLocalStorage:${key}`, () => {
    let val: string | null = null;
    let parsed: T | null = null;
    try {
      val = window.localStorage.getItem(key);
      parsed = opts?.raw || !val ? val : JSON.parse(val);
    } catch {}

    if (process.env.NODE_ENV !== 'production' && parsed && !validator(parsed)) {
      throw new Error(`useLocalStorage: ${key} failed validator: ${val}`);
    }

    if (parsed && validator(parsed)) {
      return parsed;
    }

    setItem(key, initialVal, opts?.raw);
    return initialVal;
  });

  const setValue: Memoed<SetState<T>> = useCallback(val => {
    setState(s => {
      const newState = val instanceof Function ? val(s) : val;
      if (process.env.NODE_ENV !== 'production' && !validator(newState)) {
        throw new Error(`useLocalStorage.setValue: "${newState}" failed validator.`);
      }

      setItem(key, newState, opts?.raw);
      return newState;
    });
  }, [key, opts?.raw, setState, validator]);

  const resetValue = useCallback(() => {
    setItem(key, initialVal, opts?.raw);
    setState(initialVal);
  }, [key, setState, initialVal, opts?.raw]);

  return [state, setValue, resetValue] as const;
}
