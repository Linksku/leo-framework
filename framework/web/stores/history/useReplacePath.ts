import {
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

export default function useReplacePath(): Stable<(
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
      direction,
      navCount,
    } = getNavState();
    if (path === curState.path
      && queryStr === curState.queryStr
      && hash === curState.hash) {
      return;
    }

    const newCurState = buildHistoryState({
      id: curState.id,
      path,
      query,
      queryStr,
      hash,
    });

    prefetchRoute(newCurState.path);

    updateHistoryState({
      curState: newCurState,
      replacedNavCount: navCount + 1,
      navCount: navCount + 1,
    });

    function updateNativeHistory() {
      window.history.replaceState(
        getNativeHistoryState({
          curState: newCurState,
          backState: backStates.at(0),
          forwardState: forwardStates.at(0),
          direction,
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
