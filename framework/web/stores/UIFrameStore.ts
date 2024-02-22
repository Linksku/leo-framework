import { DEFAULT_DURATION, useAnimatedValue } from 'hooks/useAnimation';
import { useAnimation } from 'hooks/useAnimation';
import useWindowEvent from 'hooks/useWindowEvent';
import useDocumentEvent from 'hooks/useDocumentEvent';
import { useThrottle } from 'utils/throttle';
import isVirtualKeyboardOpen from 'utils/isVirtualKeyboardOpen';
import isBot from 'utils/isBot';

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

    const [sidebarLoaded, setSidebarLoaded] = useState(isBot());
    const sidebarShownPercent = useAnimatedValue(
      0,
      {
        initialDuration: DEFAULT_DURATION / 3 * 2,
        debugName: 'Sidebar',
      },
    );
    const [sidebarRef, sidebarStyle] = useAnimation<HTMLDivElement>(
      sidebarShownPercent,
      'Sidebar',
    );

    const [isReloadingPage, setIsReloadingPage] = useState(false);
    const reloadPage = useCallback((delay = 0) => {
      setIsReloadingPage(true);

      if (delay) {
        setTimeout(() => {
          // @ts-ignore reload(true) is still supported
          window.location.reload(true);
        }, delay);
      } else {
        // @ts-ignore reload(true) is still supported
        window.location.reload(true);
      }
    }, []);

    const showSidebar = useCallback(() => {
      sidebarShownPercent.setVal(100, DEFAULT_DURATION / 3 * 2);
      setSidebarLoaded(true);
    }, [sidebarShownPercent]);

    const hideSidebar = useCallback(
      () => sidebarShownPercent.setVal(0, DEFAULT_DURATION / 3 * 2),
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
      isReloadingPage,
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
      isReloadingPage,
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
