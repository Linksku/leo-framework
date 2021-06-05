import { HOME_TABS } from 'config/homeTabs';

type TabType = ValueOf<typeof HOME_TABS>;

const [
  HomeRouteProvider,
  useHomeRouteStore,
  useHomeTab,
  useHomeParts,
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
      const parts: [TabType, ...string[]] = [
        newHomeTab || ref.current.homeTab,
      ];
      for (let i = 0; i < ref.current.homeParts.length && i < newParts.length; i++) {
        if (!newParts[i] && !ref.current.homeParts[i]) {
          break;
        }
        parts.push(newParts[i] || ref.current.homeParts[i]);
      }
      if (parts[0] === ref.current.homeTab && parts.length === 1) {
        return;
      }

      if (!parts[0] || parts[0] === HOME_TABS.FEED) {
        parts.pop();
      }

      const newPath = `/${parts.join('/')}`;
      if (curState.path === '/' && !curState.query) {
        pushPath(newPath);
      } else if (newPath === '/' && prevState?.path === '/' && !prevState?.query) {
        window.history.back();
      } else {
        replacePath(newPath);
      }
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
  function HomeRouteStore(val) {
    return val;
  },
  function HomeTab(val) {
    return val.homeTab;
  },
  function HomeParts(val) {
    return val.homeParts;
  },
);

export { HomeRouteProvider, useHomeRouteStore, useHomeTab, useHomeParts };
