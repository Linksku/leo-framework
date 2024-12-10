export default function useEffectInitialMount(cb: () => void) {
  const hasRun = useRef(false);

  useEffect(() => {
    if (!hasRun.current) {
      hasRun.current = true;
      const ret = cb();
      if (!process.env.PRODUCTION && ret) {
        ErrorLogger.warn(new Error('useEffectInitialMount: cleanup function not needed'));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
