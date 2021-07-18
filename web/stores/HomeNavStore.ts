import { HOME_TABS } from 'config/homeTabs';

type TabType = ValueOf<typeof HOME_TABS>;

const [
  HomeNavProvider,
  useHomeNavStore,
] = constate(
  function HomeNavStore() {
    const ref = useRef<{
      homeTab: TabType,
      homeParts: string[],
      isHome: boolean,
      wasHome: boolean,
    }>({
      homeTab: HOME_TABS.FEED,
      homeParts: [],
      isHome: false,
      wasHome: false,
    });

    const {
      prevState,
      curState,
      direction,
    } = useHistoryStore();
    const pushPath = usePushPath();
    const replacePath = useReplacePath();

    const pathParts = curState.path.slice(1).split('/');
    const prevPathParts = prevState ? prevState.path.slice(1).split('/') : null;
    ref.current.isHome = pathParts[0] === ''
      || hasOwnProperty(HOME_TABS, pathParts[0].toUpperCase());
    ref.current.wasHome = !!prevPathParts && (prevPathParts[0] === ''
      || hasOwnProperty(HOME_TABS, prevPathParts[0].toUpperCase()));

    if (ref.current.isHome) {
      if (pathParts[0] === '') {
        ref.current.homeTab = HOME_TABS.FEED;
        ref.current.homeParts = [];
      } else {
        ref.current.homeTab = pathParts[0] as TabType;
        ref.current.homeParts = pathParts.length >= 2
          ? pathParts.slice(1)
          : [];
      }
    }

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

      if (!ref.current.isHome) {
        pushPath(newPath);
      } else if (newPath === prevState?.path && !prevState?.query && !prevState?.hash) {
        if (direction === 'back') {
          window.history.forward();
        } else {
          window.history.back();
        }
      } else if (curState.path === '/'
        || (!ref.current.homeParts.length && newParts.length)) {
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
    ]);

    return useDeepMemoObj({
      homeTab: ref.current.homeTab,
      homeParts: ref.current.homeParts,
      isHome: ref.current.isHome,
      wasHome: ref.current.wasHome,
      navigateHome,
    });
  },
);

export { HomeNavProvider, useHomeNavStore };
