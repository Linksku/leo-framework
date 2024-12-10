import { atom, PrimitiveAtom, useAtom } from 'jotai';
import { atomFamily } from 'jotai/utils';

import deepFreezeIfDev from 'utils/deepFreezeIfDev';
import { DEFAULT_COOKIES_TTL } from 'consts/server';
import safeParseJson from 'utils/safeParseJson';
import stringify from 'utils/stringify';

const storageFamily = atomFamily(
  ({ initialVal }: { key: string, initialVal: any }) => atom<unknown>(initialVal),
  (a, b) => a.key === b.key,
);

function setItem<T>(
  storage: Storage,
  key: string,
  initialVal: T,
  validator: (val: unknown) => boolean,
  val: T,
  opts?: {
    ttl?: number,
  },
) {
  if (!process.env.PRODUCTION && !validator(val)) {
    throw new Error(`setItem(${key}): "${stringify(val)}" failed validator.`);
  }

  if (val === initialVal || val == null) {
    storage.removeItem(key);
  } else {
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
}

// todo: low/mid combine useSetStorage and useStorage
function useSetStorage<T>(
  type: 'local' | 'session',
  key: string,
  defaultVal: Stable<T>,
  validator: Stable<(val: unknown) => boolean>,
  opts?: Stable<{
    ttl?: number,
  }>,
): Stable<SetState<T>> {
  const storage = (type === 'local'
    ? window.localStorage
    : window.sessionStorage) as Stable<Storage>;
  const storageAtom = storageFamily({
    key: `${type},${key}`,
    initialVal: defaultVal,
  }) as PrimitiveAtom<T> & { init: T };
  const setState = useSetAtom(storageAtom);

  return useCallback(val => {
    setState(s => {
      const newState = val instanceof Function ? val(s) : val;
      setItem(storage, key, defaultVal, validator, newState, opts);
      return newState;
    });
  }, [storage, key, opts, setState, validator, defaultVal]);
}

function useStorage<T>(
  type: 'local' | 'session',
  key: string,
  _defaultVal: Stable<T>,
  validator: Stable<(val: unknown) => boolean>,
  opts?: Stable<{
    ttl?: number,
  }>,
) {
  if (!process.env.PRODUCTION && !validator(_defaultVal)) {
    throw new Error('useStorage: initialVal failed validator.');
  }
  const storage = (type === 'local'
    ? window.localStorage
    : window.sessionStorage) as Stable<Storage>;

  const defaultVal = useState(_defaultVal)[0] as Stable<T>;
  if (!process.env.PRODUCTION && _defaultVal !== defaultVal) {
    ErrorLogger.warn(
      new Error('useStorage: defaultVal changed'),
      { old: defaultVal, new: _defaultVal },
    );
  }

  const initialVal = useState(() => {
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
    return defaultVal;
  })[0] as T;
  const storageAtom = storageFamily({
    key: `${type},${key}`,
    initialVal,
  }) as PrimitiveAtom<T> & { init: T };
  const [state, setState] = useAtom(storageAtom);

  const setValue: Stable<SetState<T>> = useCallback(val => {
    setState(s => {
      const newState = val instanceof Function ? val(s) : val;
      setItem(storage, key, defaultVal, validator, newState, opts);
      return newState;
    });
  }, [storage, key, opts, setState, validator, defaultVal]);

  const resetValue = useCallback(() => {
    storage.removeItem(key);
    setState(defaultVal);
  }, [storage, key, setState, defaultVal]);

  return TS.tuple(state as Stable<T>, setValue, resetValue);
}

export function useSetLocalStorage<T>(
  key: string,
  initialVal: Stable<T>,
  validator: Stable<(val: unknown) => boolean>,
  opts?: Stable<{
    ttl?: number,
  }>,
): Stable<SetState<T>> {
  return useSetStorage('local', key, initialVal, validator, opts);
}

export function useSetSessionStorage<T>(
  key: string,
  initialVal: Stable<T>,
  validator: Stable<(val: unknown) => boolean>,
  opts?: Stable<{
    ttl?: number,
  }>,
): Stable<SetState<T>> {
  return useSetStorage('session', key, initialVal, validator, opts);
}

export function useLocalStorage<T>(
  key: string,
  initialVal: Stable<T>,
  validator: Stable<(val: unknown) => boolean>,
  opts?: Stable<{
    ttl?: number,
  }>,
): [Stable<T>, Stable<SetState<T>>, Stable<() => void>] {
  return useStorage('local', key, initialVal, validator, opts);
}

export function useSessionStorage<T>(
  key: string,
  initialVal: Stable<T>,
  validator: Stable<(val: unknown) => boolean>,
  opts?: Stable<{
    ttl?: number,
  }>,
): [Stable<T>, Stable<SetState<T>>, Stable<() => void>] {
  return useStorage('session', key, initialVal, validator, opts);
}

export const nonNegIntValidator = markStable(
  (val: unknown) => typeof val === 'number' && TS.parseIntOrNull(val) !== null && val >= 0,
);

export const nullableIdValidator = markStable(
  (val: unknown) => val === null || (typeof val === 'number' && val > 0),
);
