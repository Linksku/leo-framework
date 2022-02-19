const timed = new Set();
export default process.env.NODE_ENV !== 'production'
  ? function useTimeComponentPerf(name: string) {
    const ref = useRef({
      hasStarted: timed.has(name),
      hasEnded: timed.has(name),
    });
    if (!ref.current.hasStarted) {
      console.time(name);
      ref.current.hasStarted = true;
    }

    useEffect(() => {
      if (!ref.current.hasEnded) {
        console.timeEnd(name);
        ref.current.hasEnded = true;
      }
    }, [name]);
  }
  : NOOP;