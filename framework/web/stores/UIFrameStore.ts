import { useAnimatedValue } from 'utils/hooks/useAnimation';
import { useAnimation } from 'utils/hooks/useAnimation';

export const [
  UIFrameProvider,
  useUIFrameStore,
  useReloadPage,
] = constate(
  function UIFrameStore() {
    const [sidebarLoaded, setSidebarLoaded] = useState(false);
    const sidebarShownPercent = useAnimatedValue(0);
    const [sidebarRef, sidebarStyle] = useAnimation<HTMLDivElement>();

    const reloadSpinnerDeg = useAnimatedValue(0);
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
      () => sidebarShownPercent.setVal(0),
      [sidebarShownPercent],
    );

    const loadSidebar = useCallback(() => setSidebarLoaded(true), []);

    return useMemo(() => ({
      sidebarLoaded,
      sidebarShownPercent,
      sidebarRef,
      sidebarStyle,
      showSidebar,
      hideSidebar,
      loadSidebar,
      reloadSpinnerDeg,
      reloadPage,
    }), [
      sidebarLoaded,
      sidebarShownPercent,
      sidebarRef,
      sidebarStyle,
      showSidebar,
      hideSidebar,
      loadSidebar,
      reloadSpinnerDeg,
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
