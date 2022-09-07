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
    if (typeof initial === 'function') {
      return deepFreezeIfDev((initial as () => T)());
    }
    return deepFreezeIfDev(initial);
  });
  return [
    state,
    useCallback((patch: Partial<T> | ((prevState: T) => Partial<T>)) => {
      let newState: T | null = null;
      setState(prevState => {
        const delta = typeof patch === 'function'
          ? (patch as ((prevState: T) => T))(prevState)
          : patch;
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
