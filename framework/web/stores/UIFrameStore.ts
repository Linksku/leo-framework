import { useAnimatedValue } from 'lib/hooks/useAnimation';

export const [
  UIFrameProvider,
  useUIFrameStore,
  useReloadPage,
] = constate(
  function UIFrameStore() {
    const [sidebarLoaded, setSidebarLoaded] = useState(false);
    const sidebarShownPercent = useAnimatedValue(0);

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

    return useDeepMemoObj({
      sidebarShownPercent,
      sidebarLoaded,
      showSidebar: useCallback(() => {
        sidebarShownPercent.setVal(100);
        setSidebarLoaded(true);
      }, [sidebarShownPercent]),
      hideSidebar: useCallback(() => sidebarShownPercent.setVal(0), [sidebarShownPercent]),
      loadSidebar: useCallback(() => setSidebarLoaded(true), []),
      reloadSpinnerDeg,
      reloadPage,
    });
  },
  function UIFrameStore(val) {
    return val;
  },
  function ReloadPage(val) {
    return val.reloadPage;
  },
);
