const [
  RouteProvider,
  useRouteStore,
] = constate(
  function RouteStore({
    routeConfig,
    historyState,
    matches,
  }: {
    routeConfig: RouteConfig,
    historyState: HistoryState,
    matches: Memoed<string[]>,
  }) {
    const { stackActive, stackBot, stackTop } = useStacksNavStore();

    return useDeepMemoObj({
      routeConfig,
      historyState,
      matches,
      routeType: routeConfig.type,
      routeAuth: routeConfig.auth,
      path: historyState.path,
      query: historyState.query,
      queryStr: historyState.queryStr,
      hash: historyState.hash,
      isActiveRoute: historyState === stackActive,
      isVisibleRoute: historyState === stackBot || historyState === stackTop,
      isStackBot: historyState === stackBot,
      isStackTop: historyState === stackTop,
    });
  },
);

export { RouteProvider, useRouteStore };
