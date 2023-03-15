import useUpdatedState from 'utils/hooks/useUpdatedState';
import shallowEqual from 'utils/shallowEqual';
import { useAddPopHandler } from './HistoryStore';

type TabType = ValueOf<typeof HOME_TABS>;

export const [
  HomeNavProvider,
  useHomeNavStore,
  useHomeTab,
] = constate(
  function HomeNavStore() {
    const ref = useRef<{
      hasAttemptedExit: boolean,
      doneFirstRender: boolean,
    }>({
      // Allow immediate exit.
      hasAttemptedExit: true,
      doneFirstRender: false,
    });

    const {
      prevState,
      curState,
      didRefresh,
      navCountHack,
    } = useHistoryStore();
    const addPopHandler = useAddPopHandler();
    const showToast = useShowToast();
    const pushPath = usePushPath();
    const replacePath = useReplacePath();

    const pathParts = useMemo(() => curState.path.replace(/^\/(.+?)\/?$/, '$1').split('/'), [curState.path]);
    const prevPathParts = useMemo(
      () => (prevState?.path ? prevState.path.replace(/^\/(.+?)\/?$/, '$1').split('/') : null),
      [prevState?.path],
    );

    const isHome = useMemo(
      () => pathParts[0] === '' || pathParts[0].toUpperCase() in HOME_TABS,
      [pathParts],
    );
    const wasHome = useMemo(
      () => !!prevPathParts
        && (prevPathParts[0] === '' || prevPathParts[0].toUpperCase() in HOME_TABS),
      [prevPathParts],
    );

    const {
      homeTab,
      homeParts,
      prevHomeTab,
      prevHomeParts,
    } = useUpdatedState<{
      homeTab: TabType,
      homeParts: Memoed<string[]>,
      prevHomeTab: TabType,
      prevHomeParts: Memoed<string[]>,
    }>(
      wasHome && prevPathParts
        ? {
          homeTab: (prevPathParts[0] || HOME_TABS.FEED) as TabType,
          homeParts: prevPathParts.length >= 2 && prevPathParts[0]
            ? markMemoed(prevPathParts.slice(1))
            : EMPTY_ARR,
          prevHomeTab: HOME_TABS.FEED,
          prevHomeParts: EMPTY_ARR,
        }
        : {
          homeTab: HOME_TABS.FEED,
          homeParts: EMPTY_ARR,
          prevHomeTab: HOME_TABS.FEED,
          prevHomeParts: EMPTY_ARR,
        },
      s => {
        if (isHome) {
          if (pathParts[0] === '') {
            return {
              homeTab: HOME_TABS.FEED,
              homeParts: EMPTY_ARR,
              prevHomeTab: s.homeTab,
              prevHomeParts: s.homeParts,
            };
          }

          const areHomePartsSame = shallowEqual(pathParts.slice(1), s.homeParts);
          if (pathParts[0] !== s.homeTab || !areHomePartsSame) {
            return {
              homeTab: pathParts[0] as TabType,
              homeParts: pathParts.length >= 2
                ? (areHomePartsSame ? s.homeParts : markMemoed(pathParts.slice(1)))
                : EMPTY_ARR,
              prevHomeTab: s.homeTab,
              prevHomeParts: s.homeParts,
            };
          }
        }
        return s;
      },
    );

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

    // Add home to history.
    // todo: low/mid prevent forcing route rerender in homenavstore
    useLayoutEffect(() => {
      const { path, query, hash } = curState;
      if (!ref.current.doneFirstRender && isHome && !didRefresh && path !== '/') {
        replacePath('/', null);
        pushPath(path, query, hash);
        ref.current.doneFirstRender = true;
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return useMemo(() => ({
      homeTab,
      prevHomeTab,
      homeParts,
      prevHomeParts,
      isHome,
      wasHome,
      navCountHack,
    }), [
      homeTab,
      prevHomeTab,
      homeParts,
      prevHomeParts,
      isHome,
      wasHome,
      navCountHack,
    ]);
  },
  function HomeNavStore(val) {
    return val;
  },
  function HomeTab(val) {
    return val.homeTab;
  },
);
