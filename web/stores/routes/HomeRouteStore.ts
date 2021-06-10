import { HOME_TABS } from 'config/homeTabs';

type TabType = ValueOf<typeof HOME_TABS>;

const [
  HomeRouteProvider,
  useHomeRouteStore,
] = constate(
  function HomeRouteStore() {
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
    const [sidebarShown, setSidebarShown] = useState(false);

    const {
      prevState,
      curState,
    } = useHistoryStore();
    const { isHome } = useStacksStore();
    const pushPath = usePushPath();
    const replacePath = useReplacePath();

    const pathParts = curState.path.slice(1).split('/');
    if (isHome) {
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
      if (!newParts.length) {
        if (newHomeTab === ref.current.homeTab && !ref.current.homeParts.length) {
          return;
        }
        if (newHomeTab === HOME_TABS.FEED) {
          newPath = '/';
        }
      } else {
        newPath += `/${newParts.join('/')}`;
      }

      if (!curState.query && !prevState?.query) {
        if (newPath === prevState?.path) {
          window.history.back();
          return;
        }
        if (curState.path === '/' && !prevState?.path) {
          pushPath(newPath);
          return;
        }
      }
      replacePath(newPath);
    }, [
      curState.path,
      curState.query,
      prevState?.path,
      prevState?.query,
      pushPath,
      replacePath,
    ]);

    return useDeepMemoObj({
      sidebarShown,
      setSidebarShown,
      navigateHome,
      homeTab: ref.current.homeTab,
      homeParts: ref.current.homeParts,
    });
  },
);

export { HomeRouteProvider, useHomeRouteStore };
