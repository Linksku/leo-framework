import type { NavState } from 'stores/history/HistoryStore';
import type RouteParams from 'config/routeQueryParams';
import usePrevious from 'utils/usePrevious';
import useAccumulatedVal from 'utils/useAccumulatedVal';
import isDebug from 'utils/isDebug';

export const [
  RouteProvider,
  useRouteStore,
  useRouteMatches,
  useRouteQueryRaw,
  useGetRouteState,
  useIsRouteActive,
  useHadRouteBeenActive,
  useGetIsRouteActive,
  useIsRouteVisible,
  useRouteContainerRef,
] = constate(
  function RouteStore({
    routeConfig,
    matches,
    initialHistoryState,
    isFrozen,
    navState,
  }: {
    routeConfig: RouteConfig,
    matches: Stable<string[]>,
    initialHistoryState: HistoryState,
    isFrozen: boolean,
    navState: NavState,
  }) {
    const {
      curState,
      backStates,
      forwardStates,
      direction,
      replacedNavCount,
      isHome,
      isBackHome,
      isForwardHome,
      homeTab,
      homeParts,
      curStack,
      leftStack,
      rightStack,
    } = navState;
    const backState = backStates.at(0) ?? null;
    const forwardState = forwardStates.at(0) ?? null;

    const isCurStack = initialHistoryState.key === curStack?.key;
    const isLeftStack = initialHistoryState.key === leftStack?.key;
    const isRightStack = initialHistoryState.key === rightStack?.key;
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
        : (isRightStack ? curState : null),
      forwardState: isCurStack
        ? forwardState
        : (isLeftStack ? curState : null),
      replacedNavCount,
      isHome: isCurStack
        ? isHome
        : (direction === 'forward'
          ? isLeftStack && isBackHome
          : isLeftStack && isForwardHome),
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

    // HomeWrapInner or StackWrapInner
    const routeContainerRef = markStable(useRef<Stable<HTMLDivElement> | null>(null));

    const isRouteActive = routeState.key === curState.key;
    const wasRouteActive = usePrevious(isRouteActive);
    const hadRouteBeenActive = useAccumulatedVal(
      isRouteActive,
      s => s || isRouteActive,
    );
    const isRouteVisible = true; // Temp

    const wasFrozen = usePrevious(isFrozen);
    const frozenCount = useAccumulatedVal(
      0,
      s => s + (isFrozen === wasFrozen ? 0 : 1),
    );

    const latestRouteState = useLatest(routeState);
    const getRouteState = useCallback(() => latestRouteState.current, [latestRouteState]);
    const getIsRouteActive = useLatestCallback(() => isRouteActive);

    const obj = useMemo(() => ({
      routeConfig,
      matches,
      routeContainerRef,
      isCurStack,
      isLeftStack,
      isRightStack,
      isRouteActive,
      wasRouteActive,
      hadRouteBeenActive,
      isRouteVisible,
      frozenCount,
      ...routeState,
      getRouteState,
      getIsRouteActive,
    }), [
      routeConfig,
      matches,
      routeContainerRef,
      isCurStack,
      isLeftStack,
      isRightStack,
      isRouteActive,
      wasRouteActive,
      hadRouteBeenActive,
      frozenCount,
      isRouteVisible,
      routeState,
      getRouteState,
      getIsRouteActive,
    ]);

    if (!process.env.PRODUCTION
      && isDebug
      && isRouteActive
      && typeof window !== 'undefined') {
      // @ts-expect-error for debugging
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
    return val.isRouteActive;
  },
  function HadRouteBeenActive(val) {
    return val.hadRouteBeenActive;
  },
  function GetIsRouteActive(val) {
    return val.getIsRouteActive;
  },
  function IsRouteVisible(val) {
    return val.isRouteVisible;
  },
  function routeContainerRef(val) {
    return val.routeContainerRef;
  },
);

export function useRouteQuery<
  RouteName extends keyof RouteParams = never,
>(): Partial<Record<RouteParams[RouteName], string | number>> {
  return useRouteQueryRaw();
}
