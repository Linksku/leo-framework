import HOME_TABS from 'config/homeTabs';
import useUpdatedState from 'utils/hooks/useUpdatedState';
import shallowEqual from 'utils/shallowEqual';
import { useAddPopHandler } from './HistoryStore';

type TabType = ValueOf<typeof HOME_TABS>;

export const [
  HomeNavProvider,
  useHomeNavStore,
  useHomeParts,
  usePushHome,
  useReplaceHome,
] = constate(
  function HomeNavStore() {
    const ref = useRef<{
      hasAttemptedExit: boolean,
    }>({
      // Allow immediate exit.
      hasAttemptedExit: true,
    });

    const {
      prevState,
      curState,
      direction,
    } = useHistoryStore();
    const addPopHandler = useAddPopHandler();
    const pushPath = usePushPath();
    const replacePath = useReplacePath();
    const showToast = useShowToast();

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

    const { homeTab, homeParts, prevHomeTab, prevHomeParts } = useUpdatedState<{
      homeTab: TabType,
      homeParts: Memoed<string[]>,
      prevHomeTab: TabType,
      prevHomeParts: Memoed<string[]>,
    }>({
      homeTab: HOME_TABS.FEED,
      homeParts: EMPTY_ARR,
      prevHomeTab: HOME_TABS.FEED,
      prevHomeParts: EMPTY_ARR,
    }, s => {
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
    });
    const lastHomeHistoryState = useUpdatedState(
      isHome
        ? curState
        : (wasHome ? prevState : null),
      s => {
        if (isHome) {
          return curState;
        }
        if (wasHome) {
          return prevState;
        }
        return s;
      },
    );

    // todo: low/mid create new store for each route because curState changes while navigating
    const _pushHome = useDynamicCallback((
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

      pushPath(newPath);
    });

    const _replaceHome = useDynamicCallback((
      newHomeTab: TabType,
      ...newParts: string[]
    ) => {
      let newPath = `/${newHomeTab}`;
      if (newParts.length) {
        newPath += `/${newParts.join('/')}`;
      } else if (newHomeTab === HOME_TABS.FEED) {
        newPath = '/';
      }

      if (!isHome) {
        pushPath(newPath);
        return;
      }
      if (newPath === prevState?.path && !Object.keys(prevState.query).length && !prevState?.hash) {
        if (direction === 'back') {
          window.history.forward();
        } else {
          window.history.back();
        }
        return;
      }
      if (curState.id === 0 || !wasHome) {
        pushPath(newPath);
        return;
      }

      const isTabChanging = newHomeTab !== homeTab;
      const isPartsChanging = !shallowEqual(newParts, homeParts);
      const prevIsTabChanging = homeTab !== prevHomeTab;
      const prevIsPartsChanging = !shallowEqual(homeParts, prevHomeParts);
      if ((isTabChanging && prevIsPartsChanging) || (isPartsChanging && prevIsTabChanging)) {
        pushPath(newPath);
      } else {
        replacePath(newPath);
      }
    });

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
      lastHomeHistoryState,
      _pushHome,
      _replaceHome,
    });
  },
  function HomeNavStore(val) {
    return val;
  },
  function HomeParts(val) {
    return val.homeParts;
  },
  function PushHome(val) {
    return val._pushHome;
  },
  function ReplaceHome(val) {
    return val._replaceHome;
  },
);
