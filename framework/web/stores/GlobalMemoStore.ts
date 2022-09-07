import shallowEqual from 'utils/shallowEqual';

export const [
  GlobalMemoProvider,
  useGlobalMemoStore,
] = constate(
  function GlobalMemoStore() {
    const allVals = useRef(Object.create(null) as Memoed<ObjectOf<{
      val: any,
      deps: MemoDependencyList,
      hits: number,
      misses: number,
    }>>);

    return allVals.current;
  },
);

function useGlobalMemo<T>(
  key: string,
  cb: () => T,
  deps: MemoDependencyList,
): T {
  if (!process.env.PRODUCTION
    && !key.startsWith('use')
    && !/^[A-Z]/.test(key)
    && !key.includes(':')
    && !key.includes('.')) {
    throw new Error(`useGlobalMemo: "${key}" must contain hook or component name`);
  }

  const allVals = useGlobalMemoStore();
  const prevVal = allVals[key];
  if (!shallowEqual(prevVal?.deps, deps)) {
    allVals[key] = prevVal
      ? {
        val: cb(),
        deps,
        hits: prevVal.hits,
        misses: prevVal.misses + 1,
      }
      : {
        val: cb(),
        deps,
        hits: 0,
        misses: 0,
      };
  } else if (prevVal) {
    prevVal.hits++;
  }

  if (!process.env.PRODUCTION && prevVal && prevVal.misses >= 5 && prevVal.misses > prevVal.hits) {
    // eslint-disable-next-line no-console
    console.log(`useGlobalMemo: "${key}" has more misses than hits`, prevVal?.deps, deps, prevVal);
  }

  return TS.defined(allVals[key]).val;
}

export { useGlobalMemo };
