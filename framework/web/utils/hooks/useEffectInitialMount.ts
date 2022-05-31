export default function useEffectInitialMount(cb: () => void, deps: MemoDependencyList) {
  const hasRun = useRef(false);

  useEffect(() => {
    if (!hasRun.current) {
      hasRun.current = true;
      const ret = cb();
      if (!process.env.PRODUCTION
        // @ts-ignore in case types are wrong
        && ret) {
        throw new Error('useEffectInitialMount: cleanup function shouldn\'t be needed.');
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
