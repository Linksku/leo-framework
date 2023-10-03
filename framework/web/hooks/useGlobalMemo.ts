import shallowEqualDeps from 'utils/shallowEqualDeps';

const GlobalMemo = new Map() as Map<string, {
  val: any,
  deps: StableDependencyList,
  hits: number,
  misses: number,
}>;

export default function useGlobalMemo<T>(
  key: string,
  cb: () => T,
  deps: StableDependencyList,
): T {
  if (!process.env.PRODUCTION
    && !key.startsWith('use')
    && !/^[A-Z]/.test(key)
    && !key.includes(':')
    && !key.includes('.')) {
    throw new Error(`useGlobalMemo: "${key}" must contain hook or component name`);
  }

  const prevVal = GlobalMemo.get(key);
  let val = prevVal;
  if (!prevVal?.deps || !shallowEqualDeps(prevVal?.deps, deps)) {
    val = prevVal
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
    GlobalMemo.set(key, val);
  } else if (prevVal) {
    prevVal.hits++;
  }

  if (!process.env.PRODUCTION && prevVal && prevVal.misses >= 5 && prevVal.misses > prevVal.hits) {
    // eslint-disable-next-line no-console
    console.log(`useGlobalMemo: "${key}" has more misses than hits`, prevVal?.deps, deps, prevVal);
  }

  return TS.defined(val).val;
}
