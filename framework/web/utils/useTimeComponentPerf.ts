const started = new Map<string, number>();
const ended = new Set<string>();

export default !process.env.PRODUCTION
  ? function useTimeComponentPerf(name: string) {
    if (!started.has(name)) {
      started.set(name, performance.now());
    }

    useEffect(() => {
      const startTime = started.get(name);
      if (startTime && !ended.has(name)) {
        // eslint-disable-next-line no-console
        console.log(`${name}: ${Math.round((performance.now() - startTime) * 10) / 10}ms`);
        ended.add(name);
      }
    }, [name]);
  }
  : NOOP;
