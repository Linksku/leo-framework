import { useAnimatedValue } from 'hooks/useAnimation';
import { useAnimation } from 'hooks/useAnimation';
import useWindowEvent from 'hooks/useWindowEvent';
import useDocumentEvent from 'hooks/useDocumentEvent';
import { useThrottle } from 'utils/throttle';
import isVirtualKeyboardOpen from 'utils/isVirtualKeyboardOpen';

export const [
  UIFrameProvider,
  useUIFrameStore,
  useWindowSize,
  useReloadPage,
] = constate(
  function UIFrameStore() {
    const [windowSize, setWindowSize] = useStateStable(() => ({
      width: window.innerWidth,
      height: window.innerHeight,
    }));
    const [state, setState] = useStateStable(() => ({
      isVirtualKeyboardOpen: isVirtualKeyboardOpen(),
    }));
    // Note: .focus() on ios works only in event handler, so need to focus before async operations
    const iosFocusHackRef = useRef<HTMLInputElement | null>(null);

    const handleResize = useThrottle(
      () => {
        requestAnimationFrame(() => {
          setWindowSize({
            width: window.innerWidth,
            height: window.innerHeight,
          });

          setState({
            isVirtualKeyboardOpen: isVirtualKeyboardOpen(),
          });
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

    const [sidebarLoaded, setSidebarLoaded] = useState(false);
    const sidebarShownPercent = useAnimatedValue(
      0,
      { debugName: 'Sidebar' },
    );
    const [sidebarRef, sidebarStyle] = useAnimation<HTMLDivElement>(
      sidebarShownPercent,
      'Sidebar',
    );

    const reloadSpinnerDeg = useAnimatedValue(
      0,
      { debugName: 'ReloadSpinner' },
    );
    const reloadPage = useCallback((delay = 0) => {
      reloadSpinnerDeg.setVal(360, 300);
      setTimeout(() => {
        const MAX_SPIN_TIMES = 100;
        // Spin every 2 seconds.
        reloadSpinnerDeg.setVal(360 * MAX_SPIN_TIMES, 1500 * MAX_SPIN_TIMES);
      }, 400);

      if (delay) {
        setTimeout(() => {
          // @ts-ignore reload(true) is still supported
          window.location.reload(true);
        }, delay);
      } else {
        // @ts-ignore reload(true) is still supported
        window.location.reload(true);
      }
    }, [reloadSpinnerDeg]);

    const showSidebar = useCallback(() => {
      sidebarShownPercent.setVal(100);
      setSidebarLoaded(true);
    }, [sidebarShownPercent]);

    const hideSidebar = useCallback(
      (duration?: number) => sidebarShownPercent.setVal(0, duration),
      [sidebarShownPercent],
    );

    const loadSidebar = useCallback(() => setSidebarLoaded(true), []);

    useWindowEvent('popstate', useCallback(() => {
      hideSidebar();
    }, [hideSidebar]));

    return useMemo(() => ({
      windowSize,
      isVirtualKeyboardOpen: state.isVirtualKeyboardOpen,
      sidebarLoaded,
      sidebarShownPercent,
      sidebarRef,
      sidebarStyle,
      showSidebar,
      hideSidebar,
      loadSidebar,
      reloadSpinnerDeg,
      reloadPage,
      iosFocusHackRef,
    }), [
      windowSize,
      state.isVirtualKeyboardOpen,
      sidebarLoaded,
      sidebarShownPercent,
      sidebarRef,
      sidebarStyle,
      showSidebar,
      hideSidebar,
      loadSidebar,
      reloadSpinnerDeg,
      reloadPage,
      iosFocusHackRef,
    ]);
  },
  function UIFrameStore(val) {
    return val;
  },
  function WindowSize(val) {
    return val.windowSize;
  },
  function ReloadPage(val) {
    return val.reloadPage;
  },
);
