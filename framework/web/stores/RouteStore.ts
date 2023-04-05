import usePrevious from 'hooks/usePrevious';
import useUpdatedState from 'hooks/useUpdatedState';

export const [
  RouteProvider,
  useRouteStore,
  useRouteMatches,
  useRouteQuery,
  useIsRouteActive,
  useGetIsRouteActive,
  useInnerContainerRef,
] = constate(
  function RouteStore({
    routeConfig,
    matches,
    initialHistoryState,
    isFrozen,
  }: {
    routeConfig: RouteConfig,
    matches: Memoed<string[]>,
    initialHistoryState: HistoryState,
    isFrozen: boolean,
  }) {
    const {
      curState,
      prevState,
      direction,
      isReplaced,
    } = useHistoryStore();
    const { stackBot, stackTop } = useStacksNavStore();
    const { homeParts } = useHomeNavStore();
    const [initialState] = useState({
      historyState: initialHistoryState,
      key: initialHistoryState.key,
      path: initialHistoryState.path,
      query: initialHistoryState.query,
      queryStr: initialHistoryState.queryStr,
      hash: initialHistoryState.hash,
      id: initialHistoryState.id,
      prevState,
      direction,
      isReplaced,
      homeParts,
    });
    const [routeOpts, setRouteOpts] = useStateStable({
      disableBackSwipe: false,
      ...routeConfig.opts,
    });
    // HomeWrapInner or StackWrapInner
    const innerContainerRef = useRef<Memoed<HTMLDivElement>>(null);

    const isRouteActive = initialState.key === curState.key;
    const latestRef = useLatest(isRouteActive);
    const getIsRouteActive = useCallback(() => latestRef.current, [latestRef]);
    const wasRouteActive = usePrevious(isRouteActive);
    const wasFrozen = usePrevious(isFrozen);
    const frozenCount = useUpdatedState(
      0,
      s => s + (isFrozen === wasFrozen ? 0 : 1),
    );
    const isStackBot = initialState.key === stackBot?.key;
    const isStackTop = initialState.key === stackTop?.key;
    const obj = useMemo(() => ({
      routeConfig,
      matches,
      routeOpts,
      setRouteOpts,
      isRouteActive,
      getIsRouteActive,
      wasRouteActive,
      frozenCount,
      // Always true for now
      isRouteVisible: isStackBot || isStackTop,
      isStackBot,
      isStackTop,
      innerContainerRef,
      ...initialState,
    }), [
      routeConfig,
      matches,
      routeOpts,
      setRouteOpts,
      isRouteActive,
      getIsRouteActive,
      wasRouteActive,
      frozenCount,
      isStackBot,
      isStackTop,
      initialState,
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
  function IsRouteActive(val) {
    return val.isRouteActive;
  },
  function GetIsRouteActive(val) {
    return val.getIsRouteActive;
  },
  function InnerContainerRef(val) {
    return val.innerContainerRef;
  },
);
