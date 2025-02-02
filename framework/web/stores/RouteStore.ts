import type { NavState } from 'stores/history/HistoryStore';
import type RouteParams from 'config/routeQueryParams';
import usePrevious from 'utils/usePrevious';
import useAccumulatedVal from 'utils/useAccumulatedVal';
import isDebug from 'utils/isDebug';

export const [
  RouteProvider,
  useRouteStore,
  useRoutePath,
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
      replacedNavCount,
    } = navState;
    const backState = backStates.at(0) ?? null;
    const forwardState = forwardStates.at(0) ?? null;

    const isCurState = initialHistoryState.key === curState?.key;
    const isBackState = initialHistoryState.key === backState?.key;
    const isForwardState = initialHistoryState.key === forwardState?.key;
    const [routeState, setRouteState] = useState(() => ({
      historyState: initialHistoryState,
      key: initialHistoryState.key,
      path: initialHistoryState.path,
      query: initialHistoryState.query,
      queryStr: initialHistoryState.queryStr,
      hash: initialHistoryState.hash,
      id: initialHistoryState.id,
      backState: isCurState
        ? backState
        : (isForwardState ? curState : null),
      forwardState: isCurState
        ? forwardState
        : (isBackState ? curState : null),
      replacedNavCount,
      // Note: don't include "direction"/"prevState" here, they change based on navigation
    }));

    useEffect(() => {
      // If this route wasn't curState on first render, then some state might be wrong
      if (isCurState
        && (routeState.backState !== backState
          || routeState.forwardState !== forwardState)) {
        setRouteState(s => ({
          ...s,
          backState,
          forwardState,
        }));
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isCurState]);

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
      isCurState,
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
      isCurState,
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
  function RoutePath(val) {
    return val.path;
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
