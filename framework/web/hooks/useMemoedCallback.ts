import useUpdatedState from 'hooks/useUpdatedState';
import shallowEqual from 'utils/shallowEqual';

// Mostly for reducing rerenders.
export default function useMemoedCallback<
  Args extends (string | number)[],
  Ret,
>(
  cb: (...args: Args) => Ret,
  deps: MemoDependencyList,
): Memoed<(...args: Args) => Memoed<Ret>> {
  interface _MemoMap {
    [k: string]: Memoed<Ret> | Partial<_MemoMap>;
  }
  type MemoMap = Partial<_MemoMap>;

  const state = useUpdatedState(
    () => ({
      memoed: Object.create(null) as MemoMap,
      noArgMemoed: undefined as Memoed<Ret> | undefined,
      deps,
    }),
    s => {
      // When deps change, clear memoed.
      if (!shallowEqual(deps, s.deps)) {
        return {
          memoed: Object.create(null),
          noArgMemoed: undefined,
          deps,
        };
      }
      return s;
    },
  );

  const fn = (...args: Args) => {
    if (!args.length) {
      if (state.noArgMemoed === undefined) {
        state.noArgMemoed = (cb as () => Memoed<Ret>)();
      }
      return state.noArgMemoed;
    }

    let curObj = state.memoed;
    for (const arg of args.slice(0, -1)) {
      curObj = TS.objValOrSetDefault(curObj, arg, Object.create(null)) as MemoMap;
    }
    const lastKey = args[args.length - 1];
    if (!Object.prototype.hasOwnProperty.call(curObj, lastKey)) {
      curObj[lastKey] = markMemoed(cb(...args));
    }
    return curObj[lastKey] as Memoed<Ret>;
  };
  return useCallback(
    fn,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    deps,
  );
}
