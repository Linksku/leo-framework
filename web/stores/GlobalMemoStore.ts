import shallowEqual from 'lib/shallowEqual';

const [
  GlobalMemoProvider,
  useGlobalMemoStore,
] = constate(
  function GlobalMemoStore() {
    const allVals = useRef(Object.create(null) as Memoed<ObjectOf<{
      val: any,
      deps: MemoDependencyList,
    }>>);

    return allVals.current;
  },
);

function useGlobalMemo<T>(
  key: string,
  cb: () => T,
  deps: MemoDependencyList,
): T {
  // todo: mid/mid warn if triggered too often
  if (process.env.NODE_ENV !== 'production'
    && !key.startsWith('use')
    && !/^[A-Z]/.test(key)
    && !key.includes(':')
    && !key.includes('.')) {
    throw new Error('useGlobalMemo: key must contain hook or component name');
  }
  const allVals = useGlobalMemoStore();

  if (!shallowEqual(allVals[key], deps)) {
    allVals[key] = {
      val: cb(),
      deps,
    };
  }
  return allVals[key].val;
}

export { GlobalMemoProvider, useGlobalMemoStore, useGlobalMemo };
