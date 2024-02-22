import { useAddPopHandler } from 'stores/HistoryStore';

export default function TapToExitHandler() {
  const { prevState } = useHistoryStore();
  const latestPrevState = useLatest(prevState);
  const addPopHandler = useAddPopHandler();
  const showToast = useShowToast();
  const { isHome, homeTab } = useHomeNavStore();
  // Allow immediate exit.
  const canExitRef = useRef(true);

  useEffect(() => {
    if (!prevState
      && canExitRef.current
      && (!isHome || homeTab !== HOME_TABS.FEED)) {
      canExitRef.current = false;
      addPopHandler(() => {
        if (!latestPrevState.current
          && !canExitRef.current
          && (homeTab === HOME_TABS.FEED && isHome)) {
          showToast({
            msg: 'Tap again to exit',
          });
          canExitRef.current = true;
          return true;
        }
        return false;
      });
    }
  }, [
    prevState,
    latestPrevState,
    addPopHandler,
    showToast,
    isHome,
    homeTab,
  ]);

  return null;
}
