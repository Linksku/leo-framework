import historyQueue from 'core/globalState/historyQueue';
import type {
  Direction,
  NativeHistoryState,
  NativeHistoryStatePart,
  BaseHistoryState,
  NavState,
} from './historyStoreTypes';
import { queryStrToQuery, getFullPathFromState } from './historyStoreHelpers';

export type { NavState } from './historyStoreTypes';

export const FIRST_ID = 0;

export const MAX_BACK_STATES = 5;

export const MAX_FORWARD_STATES = 5;

// Reduce rerenders.
const QS_CACHE: Map<string, Stable<ObjectOf<string | number>>> = new Map();
const HISTORY_STATE_MEMO: Map<string, HistoryState> = new Map();
export function buildHistoryState({
  id,
  path,
  query,
  queryStr,
  hash,
}: NativeHistoryStatePart & {
  query?: ObjectOf<string | number> | null,
}): HistoryState {
  const key = `${id}:${path}?${queryStr ?? ''}#${hash ?? ''}`;
  if (!HISTORY_STATE_MEMO.has(key)) {
    if (!query && queryStr && !QS_CACHE.has(queryStr)) {
      QS_CACHE.set(queryStr, queryStrToQuery(queryStr));
    }
    HISTORY_STATE_MEMO.set(key, markStable({
      id,
      path,
      query: markStable(query)
        ?? (queryStr ? QS_CACHE.get(queryStr) : null)
        ?? EMPTY_OBJ,
      queryStr: queryStr || null,
      hash: hash || null,
      key,
    }));
  }

  return TS.defined(HISTORY_STATE_MEMO.get(key));
}

function buildHistoryStateFromLocation(id: number): HistoryState {
  const { pathname, search, hash } = window.location;
  let pathDecoded = pathname;
  try {
    pathDecoded = decodeURIComponent(pathname);
  } catch {}

  return buildHistoryState({
    id,
    path: pathDecoded,
    queryStr: search?.slice(1) || null,
    hash: hash?.slice(1) || null,
  });
}

export function getNativeHistoryState({
  curState,
  backState,
  forwardState,
  direction,
}: {
  curState: HistoryState,
  backState: Nullish<HistoryState>,
  forwardState: Nullish<HistoryState>,
  direction: Direction,
}): NativeHistoryState {
  return {
    id: curState.id,
    path: curState.path,
    queryStr: curState.queryStr,
    hash: curState.hash,
    backId: backState?.id,
    backPath: backState?.path,
    backQueryStr: backState?.queryStr,
    backHash: backState?.hash,
    forwardId: forwardState?.id,
    forwardPath: forwardState?.path,
    forwardQueryStr: forwardState?.queryStr,
    forwardHash: forwardState?.hash,
    direction,
  };
}

export function getNativeStatePart(
  nativeState: NativeHistoryState,
  type: 'current' | 'back' | 'forward',
): NativeHistoryStatePart {
  if (type === 'back') {
    if (!process.env.PRODUCTION
      && (nativeState.backId == null || nativeState.backPath == null)) {
      throw new Error('getNativeStatePart: back state is null');
    }
    return {
      id: nativeState.backId as number,
      path: nativeState.backPath as string,
      queryStr: nativeState.backQueryStr ?? null,
      hash: nativeState.backHash ?? null,
    };
  }
  if (type === 'forward') {
    if (!process.env.PRODUCTION
        && (nativeState.forwardId == null || nativeState.forwardPath == null)) {
      throw new Error('getNativeStatePart: forward state is null');
    }
    return {
      id: nativeState.forwardId as number,
      path: nativeState.forwardPath as string,
      queryStr: nativeState.forwardQueryStr ?? null,
      hash: nativeState.forwardHash ?? null,
    };
  }
  return {
    id: nativeState.id,
    path: nativeState.path,
    queryStr: nativeState.queryStr,
    hash: nativeState.hash,
  };
}

export function getInitialHistoryState(): BaseHistoryState {
  let nativeHistoryState: Nullish<NativeHistoryState>;
  try {
    nativeHistoryState = TS.typeOrNull<NativeHistoryState>(
      window.history?.state,
      val => TS.isObj(val)
        && typeof val.id === 'number'
        && typeof val.path === 'string'
        && (val.queryStr === null || typeof val.queryStr === 'string')
        && (val.hash === null || typeof val.hash === 'string')
        && (
          (
            val.prevId === undefined
            && val.prevPath === undefined
            && val.prevQueryStr === undefined
            && val.prevHash === undefined
          )
          || (
            typeof val.prevId === 'number'
            && typeof val.prevPath === 'string'
            && (val.prevQueryStr === null || typeof val.queryStr === 'string')
            && (val.prevHash === null || typeof val.prevHash === 'string')
          )
        )
        && typeof val.direction === 'string'
        && TS.includes(['none', 'back', 'forward'], val.direction),
    );
  } catch {}

  // Note: if exited app and then returned via back, we can go forward out of app
  /*
  // Either exited app and then returned via back or refreshed
  const didNavigateBackToApp = !!nativeHistoryState?.forwardId && nativeHistoryState?.direction === 'back';
  */

  const curState = nativeHistoryState
    ? buildHistoryState(nativeHistoryState)
    : buildHistoryStateFromLocation(FIRST_ID);

  let direction = nativeHistoryState?.direction ?? 'none';
  const lastPoppedStateId = TS.parseIntOrNull(window.__LAST_POPPED_STATE_ID__);
  if (lastPoppedStateId) {
    // popstate occurred before PopStateEventHandler was ready
    direction = lastPoppedStateId >= curState.id
      ? 'back'
      : 'forward';
  }

  const backStates = nativeHistoryState?.backId != null && nativeHistoryState?.backPath
    ? markStable([buildHistoryState(getNativeStatePart(nativeHistoryState, 'back'))])
    : EMPTY_ARR;
  const forwardStates = nativeHistoryState?.forwardId != null && nativeHistoryState?.forwardPath
    ? markStable([buildHistoryState(getNativeStatePart(nativeHistoryState, 'forward'))])
    : EMPTY_ARR;
  const prevState = direction === 'forward'
    ? backStates[0]
    : (direction === 'back' ? forwardStates[0] : null);
  const nextState = direction === 'forward'
    ? forwardStates[0]
    : (direction === 'back' ? backStates[0] : null);

  return {
    curState,
    backStates,
    forwardStates,
    direction,
    prevState: prevState ?? null,
    nextState: nextState ?? null,
    isInitialLoad: !lastPoppedStateId,
    replacedNavCount: null,
    popHandlers: [] as unknown as Stable<(() => boolean)[]>,
    lastPopStateTime: Number.MIN_SAFE_INTEGER,
    // After navigating back and un-suspending, WDYR would consider context unchanged
    navCount: 0,
  };
}

let HistoryStoreState = getInitialHistoryState();

const initialHistoryState = HistoryStoreState;
historyQueue.push(() => {
  const {
    curState,
    backStates,
    forwardStates,
    direction,
  } = initialHistoryState;

  window.history.replaceState(
    getNativeHistoryState({
      curState,
      backState: backStates.at(0),
      forwardState: forwardStates.at(0),
      direction,
    }),
    '',
    getFullPathFromState(curState),
  );
});

export function removePopHandler(popHandler: () => boolean): void {
  const idx = HistoryStoreState.popHandlers.indexOf(popHandler);
  if (idx >= 0) {
    HistoryStoreState.popHandlers.splice(idx, 1);
  }
}

export function addPopHandler(popHandler: () => boolean): () => void {
  if (!HistoryStoreState.popHandlers.includes(popHandler)) {
    HistoryStoreState.popHandlers.push(popHandler);
  }

  return () => removePopHandler(popHandler);
}

// todo: high/hard restore nav state after Android kills app
// https://github.com/ionic-team/capacitor/issues/7390
export const [
  HistoryProvider,
  useHistoryStore,
  useNavState,
  useGetNavState,
  useUpdateHistoryState,
] = constate(
  function HistoryStore() {
    const [pendingNavState, setPendingNavState] = useState<NavState>(
      () => markStable(HistoryStoreState),
    );

    const [deferredNavState, setDeferredNavState] = useState<NavState>(pendingNavState);
    // Without useEffect, app freezes when updateHistoryState is called outside an event handler
    // (e.g. in setTimeout or useDeferredApi's onFetch).
    useEffect(() => {
      // React.startTransition(() => {
      setTimeout(() => {
        setDeferredNavState(pendingNavState);
      }, 0);
      // });
    }, [pendingNavState]);

    // Only for event handlers
    const latestNavState = useLatest(pendingNavState);
    const getNavState = useCallback(
      () => latestNavState.current,
      [latestNavState],
    );

    const updateHistoryState = useCallback((patch: Partial<BaseHistoryState>) => {
      if (patch.curState && patch.curState.path == null) {
        ErrorLogger.warn(new Error('updateHistoryState: path is null'), patch);

        // Hacky fix for bug from Grant where path is undefined
        patch.curState = markStable({
          ...patch.curState,
          path: '/notfound',
        });
      }

      HistoryStoreState = {
        ...HistoryStoreState,
        ...patch,
      };
      HistoryStoreState.prevState = HistoryStoreState.direction === 'forward'
        ? HistoryStoreState.backStates[0]
        : (HistoryStoreState.direction === 'back' ? HistoryStoreState.forwardStates[0] : null);
      HistoryStoreState.nextState = HistoryStoreState.direction === 'forward'
        ? HistoryStoreState.forwardStates[0]
        : (HistoryStoreState.direction === 'back' ? HistoryStoreState.backStates[0] : null);

      setPendingNavState(markStable(HistoryStoreState));
    }, []);

    // useEffectInitialMount(() => {
    // todo: low/med scroll to hash in homewrap and stackwrap
    // Note: this doesn't work for deferred components,
    // also may show blank space outside overflow: hidden
    // document.getElementById(curState.hash)?.scrollIntoView(true);
    // });

    // No useMemo because store won't rerender unless there's a navigation
    return markStable({
      pendingNavState,
      deferredNavState,
      isNavigating: pendingNavState !== deferredNavState,
      getNavState,
      updateHistoryState,
    });
  },
  function HistoryStore(val) {
    return val;
  },
  function NavState(val) {
    return val.deferredNavState;
  },
  function GetNavState(val) {
    return val.getNavState;
  },
  function UpdateHistoryState(val) {
    return val.updateHistoryState;
  },
);
