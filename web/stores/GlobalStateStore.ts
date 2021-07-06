import GlobalStateEventEmitter from 'lib/singletons/GlobalStateEventEmitter';
import useForceUpdate from 'lib/hooks/useForceUpdate';

const [
  GlobalStateProvider,
  useGlobalStateStore,
] = constate(
  function GlobalStateStore() {
    const allVals = useRef(Object.create(null) as Memoed<ObjectOf<any>>);

    return allVals.current;
  },
);

function useGlobalState<T>(
  key: string,
  initialState: T | (() => T),
): [Memoed<T>, SetState<T>] {
  if (process.env.NODE_ENV !== 'production'
      && !key.startsWith('use')
      && !/^[A-Z]/.test(key)
      && !key.includes(':')
      && !key.includes('.')
  ) {
    throw new Error('useGlobalState: key must contain hook or component name');
  }

  const allVals = useGlobalStateStore();
  if (!Object.prototype.hasOwnProperty.call(allVals, key)) {
    allVals[key] = initialState instanceof Function ? initialState() : initialState;
  }

  const setState = useCallback((newVal: T | ((s: T) => T)) => {
    if (typeof newVal === 'function') {
      newVal = (newVal as (s: T) => T)(allVals[key]);
    }

    allVals[key] = newVal;
    GlobalStateEventEmitter.emit(key, newVal);
  }, [allVals, key]);

  const forceUpdate = useForceUpdate();
  useEffect(() => {
    const cb = () => {
      forceUpdate();
    };

    GlobalStateEventEmitter.addListener(key, cb);

    return () => {
      GlobalStateEventEmitter.removeListener(key, cb);
    };
  }, [key, forceUpdate]);

  return [
      allVals[key] as Memoed<T>,
      setState,
  ];
}

export { GlobalStateProvider, useGlobalStateStore, useGlobalState };
