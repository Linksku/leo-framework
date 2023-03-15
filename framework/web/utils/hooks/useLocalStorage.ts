import deepFreezeIfDev from 'utils/deepFreezeIfDev';
import { DEFAULT_COOKIES_TTL } from 'settings';

function setItem(
  key: string,
  val: any,
  opts?: Memoed<{
    ttl?: number,
  }>,
) {
  try {
    window.localStorage.setItem(
      key,
      JSON.stringify({
        val,
        exp: Date.now() + (opts?.ttl ?? DEFAULT_COOKIES_TTL),
      }),
    );
  } catch {}
}

export default function useLocalStorage<T>(
  key: string,
  initialVal: Memoed<T>,
  validator: Memoed<(val: unknown) => boolean>,
  opts?: Memoed<{
    ttl?: number,
  }>,
) {
  if (!process.env.PRODUCTION && !validator(initialVal)) {
    throw new Error('useLocalStorage: initialVal failed validator.');
  }

  const [state, setState] = useGlobalState<T>(`useLocalStorage:${key}`, () => {
    let val: string | null = null;
    let parsed: {
      val: T,
      exp: number,
     } | null = null;
    try {
      val = window.localStorage.getItem(key);
      parsed = val ? deepFreezeIfDev(JSON.parse(val)) : null;
    } catch {}

    if (parsed && typeof parsed === 'object' && parsed.exp > Date.now()) {
      if (validator(parsed.val)) {
        return parsed.val;
      }

      if (!process.env.PRODUCTION) {
        setItem(key, initialVal, opts);
        throw new Error(`useLocalStorage: ${key} failed validator: ${parsed.val}`);
      }
    }

    setItem(key, initialVal, opts);
    return initialVal;
  });

  const setValue: Memoed<SetState<T>> = useCallback(val => {
    setState(s => {
      const newState = val instanceof Function ? val(s) : val;
      if (!process.env.PRODUCTION && !validator(newState)) {
        throw new Error(`useLocalStorage.setValue: "${newState}" failed validator.`);
      }

      setItem(key, newState, opts);
      return newState;
    });
  }, [key, opts, setState, validator]);

  const resetValue = useCallback(() => {
    setItem(key, initialVal, opts);
    setState(initialVal);
  }, [key, setState, initialVal, opts]);

  return [state, setValue, resetValue] as const;
}
