import usePrevious from 'hooks/usePrevious';
import useUpdatedState from 'hooks/useUpdatedState';

export const [
  RouteProvider,
  useRouteStore,
  useRouteMatches,
  useRouteQuery,
  useGetRouteState,
  useIsRouteActive,
  useHadRouteBeenActive,
  useIsRouteVisible,
  useInnerContainerRef,
] = constate(
  function RouteStore({
    routeConfig,
    matches,
    initialHistoryState,
    isFrozen,
  }: {
    routeConfig: RouteConfig,
    matches: Stable<string[]>,
    initialHistoryState: HistoryState,
    isFrozen: boolean,
  }) {
    const {
      curState,
      backState,
      forwardState,
    } = useDeferredValue(useHistoryStore());
    const {
      curStack,
      backStack,
      forwardStack,
    } = useDeferredValue(useStacksNavStore());
    const {
      isHome,
      isBackHome,
      isForwardHome,
      homeTab,
      homeParts,
    } = useDeferredValue(useHomeNavStore());

    const isCurStack = initialHistoryState.key === curStack?.key;
    const isBackStack = initialHistoryState.key === backStack?.key;
    const isForwardStack = initialHistoryState.key === forwardStack?.key;
    const [routeState, setRouteState] = useState(() => ({
      historyState: initialHistoryState,
      key: initialHistoryState.key,
      path: initialHistoryState.path,
      query: initialHistoryState.query,
      queryStr: initialHistoryState.queryStr,
      hash: initialHistoryState.hash,
      id: initialHistoryState.id,
      backState: isCurStack
        ? backState
        : (isForwardStack ? curState : null),
      forwardState: isCurStack
        ? forwardState
        : (isBackStack ? curState : null),
      isHome: isCurStack
        ? isHome
        : (isBackStack ? isBackHome : isForwardHome),
      homeTab,
      homeParts,
      // Note: don't include "direction"/"prevState" here, they change based on navigation
    }));
    useEffect(() => {
      // If this route wasn't curStack on first render, then some state might be wrong
      if (isCurStack
        && (routeState.backState !== backState
          || routeState.forwardState !== forwardState
          || routeState.homeTab !== homeTab
          || routeState.homeParts !== homeParts)) {
        setRouteState(s => ({
          ...s,
          backState,
          forwardState,
          homeTab,
          homeParts,
        }));
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isCurStack]);

    const [routeOpts, setRouteOpts] = useStateStable({
      disableBackSwipe: false,
      ...routeConfig.opts,
    });
    // HomeWrapInner or StackWrapInner
    const innerContainerRef = useRef<Stable<HTMLDivElement>>(null);

    const isRouteActive = routeState.key === curState.key;
    const wasRouteActive = usePrevious(isRouteActive);
    const hadRouteBeenActive = useUpdatedState(
      isRouteActive,
      s => s || isRouteActive,
    );
    const isRouteVisible = true; // Temp

    const wasFrozen = usePrevious(isFrozen);
    const frozenCount = useUpdatedState(
      0,
      s => s + (isFrozen === wasFrozen ? 0 : 1),
    );

    const latestRouteState = useLatest(routeState);
    const getRouteState = useCallback(() => latestRouteState.current, [latestRouteState]);

    const deferredIsRouteActive = useDeferredValue(isRouteActive);
    const deferredHadRouteBeenActive = useDeferredValue(hadRouteBeenActive);
    const deferredIsRouteVisible = useDeferredValue(isRouteVisible);
    const obj = useMemo(() => ({
      routeConfig,
      matches,
      routeOpts,
      setRouteOpts,
      innerContainerRef,
      isCurStack,
      isBackStack,
      isForwardStack,
      isRouteActive,
      wasRouteActive,
      hadRouteBeenActive,
      isRouteVisible,
      frozenCount,
      ...routeState,
      getRouteState,
      _deferredIsRouteActive: deferredIsRouteActive,
      _deferredHadRouteBeenActive: deferredHadRouteBeenActive,
      _deferredIsRouteVisible: deferredIsRouteVisible,
    }), [
      routeConfig,
      matches,
      routeOpts,
      setRouteOpts,
      innerContainerRef,
      isCurStack,
      isBackStack,
      isForwardStack,
      isRouteActive,
      wasRouteActive,
      hadRouteBeenActive,
      frozenCount,
      isRouteVisible,
      routeState,
      getRouteState,
      deferredIsRouteActive,
      deferredHadRouteBeenActive,
      deferredIsRouteVisible,
    ]);

    if (!process.env.PRODUCTION && typeof window !== 'undefined' && isRouteActive) {
      // @ts-ignore for debugging
      window.route = obj;
    }

    return obj;
  },
  function RouteStore(val) {
    return val;
  },
  function RouteMatches(val) {
    return val.matches;
  },
  function RouteQuery(val) {
    return val.query;
  },
  function GetRouteState(val) {
    return val.getRouteState;
  },
  function IsRouteActive(val) {
    return val._deferredIsRouteActive;
  },
  function HadRouteBeenActive(val) {
    return val._deferredHadRouteBeenActive;
  },
  function IsRouteVisible(val) {
    return val._deferredIsRouteVisible;
  },
  function InnerContainerRef(val) {
    return val.innerContainerRef;
  },
);
