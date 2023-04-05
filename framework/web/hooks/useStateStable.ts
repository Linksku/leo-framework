import deepFreezeIfDev from 'utils/deepFreezeIfDev';

export default function useStateStable<T extends ObjectOf<any>>(
  initial: T | (() => T),
): [
  Memoed<
    T extends Primitive ? T
    : (keyof T) extends never ? T
    : MemoObjShallow<T>
  >,
  Memoed<(patch: Partial<T> | ((prevState: T) => Partial<T>)) => void>,
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
  return [
    state,
    useCallback((patch: Partial<T> | ((prevState: T) => Partial<T>)) => {
      let newState: T | null = null;
      setState(prevState => {
        const delta = typeof patch === 'function'
          ? (patch as ((prevState: T) => T))(prevState)
          : patch;

        if (Array.isArray(delta)) {
          if (prevState.length !== delta.length
            || !delta.every((v, i) => v === prevState[i])) {
            // Hack for WDYR + double-invocation
            if (!newState) {
              newState = deepFreezeIfDev(delta as unknown as T);
            }
            return newState;
          }
          return prevState;
        }

        for (const k of Object.keys(delta)) {
          if (prevState[k] !== delta[k]) {
            // Hack for WDYR + double-invocation
            if (!newState) {
              newState = deepFreezeIfDev({ ...prevState, ...delta });
            }
            return newState;
          }
        }
        return prevState;
      });
    }, []),
  ];
}
