import { useThrottle } from 'lib/throttle';

export default function useRefWidth<T extends HTMLElement>() {
  const [width, setWidth] = useState(null as number | null);
  const ref = useRef<T>(null);

  const handleResize = useThrottle(
    () => {
      setWidth(ref.current?.offsetWidth ?? null);
    },
    {
      timeout: 400,
      allowSchedulingDuringDelay: true,
    },
    [setWidth],
  );

  useLayoutEffect(() => {
    setWidth(ref.current?.offsetWidth ?? null);

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [handleResize]);

  return { ref, width };
}
