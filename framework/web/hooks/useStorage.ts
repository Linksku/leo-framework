import deepFreezeIfDev from 'utils/deepFreezeIfDev';
import { DEFAULT_COOKIES_TTL } from 'consts/server';
import safeParseJson from 'utils/safeParseJson';
import stringify from 'utils/stringify';

function setItem(
  storage: Storage,
  key: string,
  val: any,
  opts?: Stable<{
    ttl?: number,
  }>,
) {
  try {
    storage.setItem(
      key,
      JSON.stringify({
        val,
        exp: Date.now() + (opts?.ttl ?? DEFAULT_COOKIES_TTL),
      }),
    );
  } catch {}
}

function useStorage<T>(
  type: 'local' | 'session',
  key: string,
  initialVal: Stable<T>,
  validator: Stable<(val: unknown) => boolean>,
  opts?: Stable<{
    ttl?: number,
  }>,
) {
  if (!process.env.PRODUCTION && !validator(initialVal)) {
    throw new Error('useStorage: initialVal failed validator.');
  }
  const storage = (type === 'local'
    ? window.localStorage
    : window.sessionStorage) as Stable<Storage>;

  const [state, setState] = useGlobalState<T>(`useStorage:${type},${key}`, () => {
    const data = storage.getItem(key);
    const parsed = data && safeParseJson<{
      val: T,
      exp: number,
    }>(
      data,
      val => TS.isObj(val) && typeof val.exp === 'number',
    );

    if (parsed && parsed.exp > Date.now()) {
      if (validator(parsed.val)) {
        return deepFreezeIfDev(parsed.val);
      }

      if (!process.env.PRODUCTION) {
        ErrorLogger.error(new Error(`useStorage: ${key} failed validator: ${stringify(parsed.val)}`));
      }
    }

    storage.removeItem(key);
    return initialVal;
  });

  const setValue: Stable<SetState<T>> = useCallback(val => {
    setState(s => {
      const newState = val instanceof Function ? val(s) : val;
      if (!process.env.PRODUCTION && !validator(newState)) {
        throw new Error(`useStorage.setValue: "${stringify(newState)}" failed validator.`);
      }

      if (newState === initialVal || newState == null) {
        storage.removeItem(key);
      } else {
        setItem(storage, key, newState, opts);
      }
      return newState;
    });
  }, [storage, key, opts, setState, validator, initialVal]);

  const resetValue = useCallback(() => {
    storage.removeItem(key);
    setState(initialVal);
  }, [storage, key, setState, initialVal]);

  return [state, setValue, resetValue] as const;
}

export function useLocalStorage<T>(
  key: string,
  initialVal: Stable<T>,
  validator: Stable<(val: unknown) => boolean>,
  opts?: Stable<{
    ttl?: number,
  }>,
) {
  return useStorage('local', key, initialVal, validator, opts);
}

export function useSessionStorage<T>(
  key: string,
  initialVal: Stable<T>,
  validator: Stable<(val: unknown) => boolean>,
  opts?: Stable<{
    ttl?: number,
  }>,
) {
  return useStorage('session', key, initialVal, validator, opts);
}
