const started = new Set();
const ended = new Set();

export default !process.env.PRODUCTION
  ? function useTimeComponentPerf(name: string) {
    if (!started.has(name)) {
      console.time(name);
      started.add(name);
    }

    useEffect(() => {
      if (!ended.has(name)) {
        console.timeEnd(name);
        ended.add(name);
      }
    }, [name]);
  }
  : NOOP;
