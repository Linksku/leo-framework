import useUpdate from 'lib/hooks/useUpdate';

import GlobalStateEventEmitter from 'lib/singletons/GlobalStateEventEmitter';

export const [
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
    && (
      (!key.startsWith('use') && !/^[A-Z]/.test(key))
      || (!key.includes(':') && !key.includes('.'))
    )
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

    const prevVal = allVals[key];
    allVals[key] = newVal;
    if (prevVal !== newVal) {
      batchedUpdates(() => {
        GlobalStateEventEmitter.emit(key);
      });
    }
  }, [allVals, key]);

  const update = useUpdate();
  useEffect(() => {
    const cb = () => {
      update();
    };

    GlobalStateEventEmitter.addListener(key, cb);

    return () => {
      GlobalStateEventEmitter.removeListener(key, cb);
    };
  }, [key, update]);

  return [
    allVals[key] as Memoed<T>,
    setState,
  ];
}

export { useGlobalState };
