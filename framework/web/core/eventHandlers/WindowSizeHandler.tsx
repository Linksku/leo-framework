import useWindowEvent from 'utils/useWindowEvent';
import useDocumentEvent from 'utils/useDocumentEvent';
import { useThrottle } from 'utils/throttle';
import { windowSizeAtom } from 'core/globalState/useWindowSize';

export default function WindowSizeHandler() {
  const setWindowSize = useSetAtom(windowSizeAtom);

  const handleResize = useThrottle(
    () => {
      requestAnimationFrame(() => {
        setWindowSize(s => (s.width === window.innerWidth && s.height === window.innerHeight
          ? s
          : {
            width: window.innerWidth,
            height: window.innerHeight,
          }));
      });
    },
    useConst({
      timeout: 100,
    }),
  );
  useWindowEvent('resize', handleResize);
  // Don't know if `focus` is needed. Distinguish between input focus and tab focus
  // useWindowEvent('focus', handleResize);
  useDocumentEvent('visibilitychange', handleResize);
  useEffect(() => {
    window.visualViewport?.addEventListener('resize', handleResize);

    return () => {
      window.visualViewport?.removeEventListener('resize', handleResize);
    };
  }, [handleResize]);

  return null;
}
