import { addPopHandler, removePopHandler } from 'stores/history/HistoryStore';
import { DEFAULT_DURATION, useAnimatedValue, useAnimation } from 'core/useAnimation';
import useWindowEvent from 'utils/useWindowEvent';
import isBot from 'utils/isBot';

export const [
  UIFrameProvider,
  useUIFrameStore,
  useReloadPage,
] = constate(
  function UIFrameStore() {
    const [sidebarLoaded, setSidebarLoaded] = useState(isBot());
    const shownRef = useRef(false);
    const sidebarShownPercent = useAnimatedValue(
      0,
      {
        defaultDuration: DEFAULT_DURATION * 0.75,
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
          // @ts-expect-error reload(true) is still supported
          window.location.reload(true);
        }, delay);
      } else {
        // @ts-expect-error reload(true) is still supported
        window.location.reload(true);
      }
    }, []);

    const handlePopHistory = useCallback(() => {
      if (shownRef.current) {
        shownRef.current = false;
        sidebarShownPercent.setVal(0);
        return true;
      }
      return false;
    }, [sidebarShownPercent]);

    const showSidebar = useCallback(() => {
      shownRef.current = true;
      sidebarShownPercent.setVal(100);
      setSidebarLoaded(true);
      addPopHandler(handlePopHistory);
    }, [sidebarShownPercent, handlePopHistory]);

    const hideSidebar = useCallback(() => {
      shownRef.current = false;
      sidebarShownPercent.setVal(0);
      removePopHandler(handlePopHistory);
    }, [sidebarShownPercent, handlePopHistory]);

    const loadSidebar = useCallback(() => setSidebarLoaded(true), []);

    useWindowEvent('popstate', useCallback(() => {
      hideSidebar();
    }, [hideSidebar]));

    return useMemo(() => ({
      sidebarLoaded,
      sidebarShownPercent,
      sidebarRef,
      sidebarStyle,
      showSidebar,
      hideSidebar,
      loadSidebar,
      isReloadingPage,
      reloadPage,
    }), [
      sidebarLoaded,
      sidebarShownPercent,
      sidebarRef,
      sidebarStyle,
      showSidebar,
      hideSidebar,
      loadSidebar,
      isReloadingPage,
      reloadPage,
    ]);
  },
  function UIFrameStore(val) {
    return val;
  },
  function ReloadPage(val) {
    return val.reloadPage;
  },
);
