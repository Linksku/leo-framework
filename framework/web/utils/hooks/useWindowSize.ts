import { useThrottle } from 'utils/throttle';
import useWindowEvent from 'utils/hooks/useWindowEvent';

// todo: low/easy make useWindowSize share state/effect across components
export default function useWindowSize() {
  const [state, setState] = useStateStable({
    width: window.innerWidth,
    height: window.innerHeight,
  });
  const rafRef = useRef<number | null>(null);

  const throttledCb = useThrottle(
    () => {
      rafRef.current = requestAnimationFrame(() => {
        setState({
          width: window.innerWidth,
          height: window.innerHeight,
        });
      });
    },
    useConst({
      timeout: 100,
    }),
  );
  useWindowEvent('resize', throttledCb);

  useEffect(() => () => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
    }
  }, []);

  return state;
}
