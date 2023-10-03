import EventEmitter from 'utils/EventEmitter';

import { useSyncExternalStore } from 'react';

const GlobalStateEventEmitter = markStable(new EventEmitter());

const GlobalState = new Map() as Stable<Map<string, any>>;

// todo: low/mid maybe replace global state with atoms etc
export default function useGlobalState<T>(
  key: string,
  initialState: T | (() => T),
): [Stable<T>, SetState<T>] {
  if (!process.env.PRODUCTION
    && (
      (!key.startsWith('use') && !/^[A-Z]/.test(key))
      || (!key.includes(':') && !key.includes('.'))
    )
  ) {
    throw new Error('useGlobalState: key must contain hook or component name');
  }

  if (!GlobalState.has(key)) {
    GlobalState.set(key, initialState instanceof Function ? initialState() : initialState);
  }

  const state = useSyncExternalStore(
    useCallback(cb => {
      GlobalStateEventEmitter.on(key, cb);
      return () => {
        GlobalStateEventEmitter.off(key, cb);
      };
    }, [key]),
    () => GlobalState.get(key) as Stable<T>,
  );

  const setState = useCallback((newVal: T | ((s: T) => T)) => {
    if (typeof newVal === 'function') {
      newVal = (newVal as (s: T) => T)(GlobalState.get(key));
    }

    const prevVal = GlobalState.get(key);
    GlobalState.set(key, newVal);
    if (prevVal !== newVal) {
      GlobalStateEventEmitter.emit(key);
    }
  }, [key]);

  return [
    state as Stable<T>,
    setState,
  ];
}
