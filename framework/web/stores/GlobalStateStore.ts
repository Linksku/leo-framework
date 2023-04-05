import useUpdate from 'hooks/useUpdate';

import GlobalStateEventEmitter from 'services/GlobalStateEventEmitter';

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
  if (!process.env.PRODUCTION
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
      GlobalStateEventEmitter.emit(key);
    }
  }, [allVals, key]);

  const update = useUpdate();
  useEffect(() => {
    const cb = () => {
      update();
    };

    GlobalStateEventEmitter.on(key, cb);

    return () => {
      GlobalStateEventEmitter.off(key, cb);
    };
  }, [key, update]);

  return [
    allVals[key] as Memoed<T>,
    setState,
  ];
}

export { useGlobalState };
