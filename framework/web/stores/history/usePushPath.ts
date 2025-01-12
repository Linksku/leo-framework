import {
  MAX_BACK_STATES,
  buildHistoryState,
  getNativeHistoryState,
  useGetNavState,
  useUpdateHistoryState,
} from 'stores/history/HistoryStore';
import {
  getFullPathFromState,
  getPartsFromPath,
} from 'stores/history/historyStoreHelpers';
import historyQueue from 'core/globalState/historyQueue';
import prefetchRoute from 'core/router/prefetchRoute';

export default function usePushPath(): Stable<(
  rawPath: string,
  rawQuery?: ObjectOf<string | number> | null,
  rawHash?: string | null,
  sync?: boolean,
) => void> {
  const getNavState = useGetNavState();
  const updateHistoryState = useUpdateHistoryState();

  return useCallback((
    rawPath: string,
    rawQuery: ObjectOf<string | number> | null = null,
    rawHash: string | null = null,
    sync = false,
  ) => {
    const {
      path,
      query,
      queryStr,
      hash,
    } = getPartsFromPath(rawPath, rawQuery, rawHash);
    const {
      curState,
      backStates,
      forwardStates,
      navCount,
    } = getNavState();
    const backState = backStates.at(0);
    const forwardState = forwardStates.at(0);

    if (path === curState.path
      && queryStr === curState.queryStr
      && hash === curState.hash) {
      return;
    }

    if (path === backState?.path
      && queryStr === backState.queryStr
      && hash === backState.hash) {
      // todo: low/mid disallow back to auto-added home
      historyQueue.back();
      return;
    }

    const newCurState = path === forwardState?.path
      && queryStr === forwardState.queryStr
      && hash === forwardState.hash
      ? forwardState
      : buildHistoryState({
        id: curState.id + 1,
        path,
        query,
        queryStr,
        hash,
      });
    const newBackState = curState;

    prefetchRoute(newCurState.path);

    updateHistoryState({
      curState: newCurState,
      backStates: markStable([newBackState, ...backStates.slice(0, MAX_BACK_STATES - 1)]),
      forwardStates: EMPTY_ARR,
      direction: 'forward',
      isInitialLoad: false,
      replacedNavCount: null,
      navCount: navCount + 1,
      popHandlers: [] as unknown as Stable<(() => boolean)[]>,
    });

    function updateNativeHistory() {
      window.history.replaceState(
        getNativeHistoryState({
          curState,
          backState,
          forwardState: newCurState,
          direction: 'forward',
        }),
        '',
        getFullPathFromState(curState),
      );

      window.history.pushState(
        getNativeHistoryState({
          curState: newCurState,
          backState: newBackState,
          forwardState: null,
          direction: 'forward',
        }),
        '',
        getFullPathFromState(newCurState),
      );
    }

    if (sync) {
      updateNativeHistory();
    } else {
      historyQueue.push(updateNativeHistory);
    }
  }, [getNavState, updateHistoryState]);
}
