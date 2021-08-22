import HOME_TABS from 'config/homeTabs';
import useUpdatedState from 'lib/hooks/useUpdatedState';
import shallowEqual from 'lib/shallowEqual';
import { useAnimatedValue } from 'lib/hooks/useAnimation';

type TabType = ValueOf<typeof HOME_TABS>;

const [
  HomeNavProvider,
  useHomeNavStore,
] = constate(
  function HomeNavStore() {
    const ref = useRef<{
      hasAttemptedExit: boolean,
    }>({
      // Allow immediate exit.
      hasAttemptedExit: true,
    });
    const [sidebarLoaded, setSidebarLoaded] = useState(false);
    const sidebarShownPercent = useAnimatedValue(0);

    const {
      prevState,
      curState,
      direction,
      addPopHandler,
    } = useHistoryStore();
    const pushPath = usePushPath();
    const replacePath = useReplacePath();
    const showToast = useShowToast();

    const pathParts = useMemo(() => curState.path.slice(1).split('/'), [curState.path]);
    const prevPathParts = useMemo(
      () => (prevState?.path ? prevState.path.slice(1).split('/') : null),
      [prevState?.path],
    );

    const isHome = useMemo(
      () => pathParts[0] === '' || hasOwnProperty(HOME_TABS, pathParts[0].toUpperCase()),
      [pathParts],
    );
    const wasHome = useMemo(
      () => !!prevPathParts && (prevPathParts[0] === '' || hasOwnProperty(HOME_TABS, prevPathParts[0].toUpperCase())),
      [prevPathParts],
    );

    const { homeTab, homeParts } = useUpdatedState<{
      homeTab: TabType,
      homeParts: Memoed<string[]>,
    }>({
      homeTab: HOME_TABS.FEED,
      homeParts: EMPTY_ARR,
    }, s => {
      if (isHome) {
        if (pathParts[0] === '') {
          return {
            homeTab: HOME_TABS.FEED,
            homeParts: EMPTY_ARR,
          };
        }
        if (pathParts[0] !== s.homeTab
          || !shallowEqual(pathParts.slice(1), s.homeParts)) {
          return {
            homeTab: pathParts[0] as TabType,
            homeParts: pathParts.length >= 2
              ? markMemoed(pathParts.slice(1))
              : EMPTY_ARR,
          };
        }
      }
      return s;
    });

    // todo: low/mid create new store for each route because curState changes while navigating
    const navigateHome = useCallback((
      newHomeTab: TabType,
      ...newParts: string[]
    ) => {
      let newPath = `/${newHomeTab}`;
      if (newParts.length) {
        // todo: low/easy for default newParts (i.e. /clubs), remove newParts
        newPath += `/${newParts.join('/')}`;
      } else if (newHomeTab === HOME_TABS.FEED) {
        newPath = '/';
      }

      if (!isHome) {
        pushPath(newPath);
      } else if (newPath === prevState?.path && !prevState?.query && !prevState?.hash) {
        if (direction === 'back') {
          window.history.forward();
        } else {
          window.history.back();
        }
      } else if (curState.path === '/' || !shallowEqual(homeParts, newParts)) {
        pushPath(newPath);
      } else {
        replacePath(newPath);
      }
    }, [
      curState,
      prevState,
      direction,
      pushPath,
      replacePath,
      isHome,
      homeParts,
    ]);

    useEffect(() => {
      if (ref.current.hasAttemptedExit
        && (homeTab !== HOME_TABS.FEED || !isHome)) {
        ref.current.hasAttemptedExit = false;
        addPopHandler(() => {
          if (!ref.current.hasAttemptedExit && (homeTab === HOME_TABS.FEED && isHome)) {
            showToast({
              msg: 'Tap again to exit',
            });
            ref.current.hasAttemptedExit = true;
            return true;
          }
          return false;
        });
      }
    }, [addPopHandler, showToast, curState, isHome, homeTab]);

    return useDeepMemoObj({
      homeTab,
      homeParts,
      isHome,
      wasHome,
      navigateHome,
      sidebarShownPercent,
      sidebarLoaded,
      showSidebar: useCallback(() => {
        sidebarShownPercent.setVal(100);
        setSidebarLoaded(true);
      }, [sidebarShownPercent]),
      hideSidebar: useCallback(() => sidebarShownPercent.setVal(0), [sidebarShownPercent]),
      loadSidebar: useCallback(() => setSidebarLoaded(true), []),
    });
  },
);

export { HomeNavProvider, useHomeNavStore };
