export const [
  RouteProvider,
  useRouteStore,
  useRouteMatches,
  useRouteQuery,
] = constate(
  function RouteStore({
    routeConfig,
    matches,
    initialHistoryState,
  }: {
    routeConfig: RouteConfig,
    matches: Memoed<string[]>,
    initialHistoryState: HistoryState,
  }) {
    const { curState, prevState, direction, isReplaced } = useHistoryStore();
    const { stackBot, stackTop } = useStacksNavStore();
    const { homeParts } = useHomeNavStore();
    const initialState = useRef({
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
    // HomeWrapInner or StackWrapInner
    const innerContainerRef = useRef<Memoed<HTMLDivElement>>(null);

    const isActive = initialState.current.key === curState.key;
    const isStackBot = initialState.current.key === stackBot?.key;
    const isStackTop = initialState.current.key === stackTop?.key;
    const obj = useDeepMemoObj({
      routeConfig,
      matches,
      isRouteActive: isActive,
      // Always true for now
      isRouteVisible: isStackBot || isStackTop,
      isStackBot,
      isStackTop,
      innerContainerRef,
      ...initialState.current,
    });

    if (!process.env.PRODUCTION && typeof window !== 'undefined' && isActive) {
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
);
