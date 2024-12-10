import shallowEqualDeps from 'utils/shallowEqualDeps';

// Prevents double invocation, e.g. for logging
function useEffectOncePerDeps(cb: () => void, deps: StableDependencyList) {
  const prevDeps = useRef<StableDependencyList | undefined>(undefined);

  useEffect(() => {
    if (!prevDeps.current || !shallowEqualDeps(deps, prevDeps.current)) {
      prevDeps.current = deps;
      const ret = cb();
      if (!process.env.PRODUCTION && ret) {
        throw new Error('useEffectOncePerDeps: cleanup function shouldn\'t be needed.');
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

export default process.env.PRODUCTION
  ? useEffect
  : useEffectOncePerDeps;
