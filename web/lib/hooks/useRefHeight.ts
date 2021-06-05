import { useThrottle } from 'lib/throttle';

export default function useRefHeight<T extends HTMLElement>() {
  const [height, setHeight] = useState(null as number | null);
  const ref = useRef<T>(null);

  const handleResize = useThrottle(
    () => {
      setHeight(ref.current?.offsetHeight ?? null);
    },
    {
      timeout: 400,
      allowSchedulingDuringDelay: true,
    },
    [setHeight],
  );

  useLayoutEffect(() => {
    setHeight(ref.current?.offsetHeight ?? null);

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [handleResize]);

  return { ref, height };
}
