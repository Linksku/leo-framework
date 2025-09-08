import {
  buildHistoryState,
  getNativeHistoryState,
  useGetNavState,
  useUpdateHistoryState,
} from 'stores/history/HistoryStore';
import { getFullPath, getFullPathFromState } from 'stores/history/historyStoreHelpers';

export default function usePrependPathToHistory():
  Stable<(path: string, replaceCurPath?: boolean) => void> {
  const getNavState = useGetNavState();
  const updateHistoryState = useUpdateHistoryState();

  return useCallback((path: string) => {
    const {
      curState,
      forwardStates,
      navCount,
      direction,
    } = getNavState();
    const forwardState = forwardStates.at(0);

    const newBackState = buildHistoryState({
      id: curState.id - 1,
      path,
      queryStr: null,
      hash: null,
    });

    updateHistoryState({
      backStates: markStable([newBackState]),
      replacedNavCount: navCount + 1,
      navCount: navCount + 1,
    });

    // No requestIdleCallback because of goLeft
    window.history.replaceState(
      getNativeHistoryState({
        curState: newBackState,
        backState: null,
        forwardState: curState,
        direction: 'none',
      }),
      '',
      getFullPath(path, null, null),
    );

    window.history.pushState(
      getNativeHistoryState({
        curState,
        backState: newBackState,
        forwardState,
        direction,
      }),
      '',
      getFullPathFromState(curState),
    );
  }, [getNavState, updateHistoryState]);
}
