import { FIRST_ID, useGetNavState } from 'stores/history/HistoryStore';
import { requestIdleCallback } from 'utils/requestIdleCallback';
import historyQueue from 'core/globalState/historyQueue';
import usePrependPathToHistory from 'stores/history/usePrependPathToHistory';

export default function useGoLeft(): Stable<(defaultBackPath?: string | null) => void> {
  const getNavState = useGetNavState();
  const prependPathToHistory = usePrependPathToHistory();
  const replacePath = useReplacePath();

  // Handles bugs with going back twice before rerender
  let pendingNavTimer: number | null = null;
  return useCallback((defaultBackPath?: string | null) => {
    const {
      curState,
      backStates,
    } = getNavState();
    const backState = backStates.at(0);

    if (pendingNavTimer != null) {
      return;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    pendingNavTimer = requestIdleCallback(() => {
      pendingNavTimer = null;
    }, { timeout: 1000 });

    if (!backState) {
      prependPathToHistory(defaultBackPath || '/');
      historyQueue.back();
    } else if (defaultBackPath
      && backState.path === '/'
      && backState.id < FIRST_ID
      && defaultBackPath !== curState.path
    ) {
      historyQueue.flush();

      setTimeout(() => {
        historyQueue.back();
        window.addEventListener(
          'popstate',
          () => {
            replacePath(defaultBackPath);
          },
          { once: true },
        );
      }, 0);
    } else {
      historyQueue.back();
    }
  }, [getNavState, prependPathToHistory]);
}
