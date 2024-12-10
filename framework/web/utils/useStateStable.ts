import deepFreezeIfDev from 'utils/deepFreezeIfDev';

export default function useStateStable<T extends ObjectOf<any>>(
  initial: T | (() => T),
): [
  StableShallow<T>,
  Stable<(patch: Partial<T> | ((prevState: T) => Partial<T>)) => void>,
] {
  const [state, setState] = useState(() => {
    const val = typeof initial === 'function'
      ? (initial as () => T)()
      : initial;
    if (!process.env.PRODUCTION && val?.constructor !== Object) {
      throw new Error('useStateStable should have a plain object');
    }
    return deepFreezeIfDev(val);
  });

  useDebugValue(state);

  return [
    state as StableShallow<T>,
    useCallback((patch: Partial<T> | ((prevState: T) => Partial<T>)) => {
      let lastPrevState: T | null = null;
      let newState: T | null = null;
      setState(prevState => {
        const delta = typeof patch === 'function'
          ? (patch as ((prevState: T) => T))(prevState)
          : patch;

        for (const k of Object.keys(delta)) {
          if (prevState[k] !== delta[k]) {
            if (process.env.PRODUCTION) {
              return { ...prevState, ...delta };
            }

            // Hack for WDYR + double-invocation
            if (!newState || prevState !== lastPrevState) {
              newState = deepFreezeIfDev({ ...prevState, ...delta });
              lastPrevState = prevState;
            }
            return newState;
          }
        }
        return prevState;
      });
    }, []),
  ];
}
