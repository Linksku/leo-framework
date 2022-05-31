import shallowEqual from 'utils/shallowEqual';

export default function useEffectOncePerDeps(cb: () => void, deps: MemoDependencyList) {
  const prevDeps = useRef<MemoDependencyList | undefined>(undefined);

  useEffect(() => {
    if (!shallowEqual(deps, prevDeps)) {
      prevDeps.current = deps;
      const ret = cb();
      if (!process.env.PRODUCTION
        // @ts-ignore in case types are wrong
        && ret) {
        throw new Error('useEffectOncePerDeps: cleanup function shouldn\'t be needed.');
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
