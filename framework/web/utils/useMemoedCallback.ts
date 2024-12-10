import useAccumulatedVal from 'utils/useAccumulatedVal';
import shallowEqualDeps from 'utils/shallowEqualDeps';

// Mostly for reducing rerenders.
export default function useMemoedCallback<
  Args extends (string | number)[],
  Ret,
>(
  cb: (...args: Args) => Ret,
  deps: StableDependencyList,
): Stable<(...args: Args) => Stable<Ret>> {
  interface _MemoMap {
    [k: string]: Stable<Ret> | Partial<_MemoMap>;
  }
  type MemoMap = Partial<_MemoMap>;

  const state = useAccumulatedVal(
    {
      memoed: Object.create(null) as MemoMap,
      noArgMemoed: undefined as Stable<Ret> | undefined,
      deps,
    },
    s => {
      // When deps change, clear memoed.
      if (!shallowEqualDeps(deps, s.deps)) {
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
        state.noArgMemoed = (cb as () => Stable<Ret>)();
      }
      return state.noArgMemoed;
    }

    let curObj = state.memoed;
    for (const arg of args.slice(0, -1)) {
      curObj = TS.objValOrSetDefault(curObj, arg, Object.create(null)) as MemoMap;
    }
    const lastKey = TS.defined(args.at(-1));
    if (!Object.prototype.hasOwnProperty.call(curObj, lastKey)) {
      curObj[lastKey] = markStable(cb(...args));
    }
    return curObj[lastKey] as Stable<Ret>;
  };
  return useCallback(
    fn,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    deps,
  );
}
