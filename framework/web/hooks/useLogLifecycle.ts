export default function useLogLifecycle(name: string) {
  const numRenders = useRef(1);
  numRenders.current = 1;
  const numMounts = useRef(1);
  numMounts.current = 1;
  const numUnmounts = useRef(1);
  numUnmounts.current = 1;

  useEffect(() => {
    if (numMounts.current === 1) {
      // eslint-disable-next-line no-console
      console.log(`mount ${name}`);
    }
    numMounts.current++;

    return () => {
      if (numMounts.current === 1 || numUnmounts.current === 2) {
        // eslint-disable-next-line no-console
        console.log(`unmount ${name}`);
      }
      numUnmounts.current++;
    };
  }, [name]);

  useEffect(() => {
    if (numRenders.current === 1) {
      // eslint-disable-next-line no-console
      console.log(`render ${name}`);
    }
    numRenders.current++;
  });
}
