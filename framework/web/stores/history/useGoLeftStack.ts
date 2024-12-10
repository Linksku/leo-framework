import { FIRST_ID, useGetNavState } from 'stores/history/HistoryStore';
import { requestIdleCallback } from 'utils/requestIdleCallback';
import historyStateQueue from 'core/globalState/historyStateQueue';
import usePrependPathToHistory from './usePrependPathToHistory';

export default function useGoLeftStack(): Stable<(defaultBackPath?: string | null) => void> {
  const getNavState = useGetNavState();
  const prependPathToHistory = usePrependPathToHistory();
  const replacePath = useReplacePath();

  // Handles bugs with going back twice before rerender
  let pendingNavTimer: number | null = null;
  return useCallback((defaultBackPath?: string | null) => {
    const {
      curState,
      backStates,
      isHome,
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

      if (!isHome) {
        historyStateQueue.back();
      }
    } else if (defaultBackPath
      && backState.path === '/'
      && backState.id < FIRST_ID
      && defaultBackPath !== curState.path
    ) {
      historyStateQueue.flush();

      setTimeout(() => {
        historyStateQueue.back();
        window.addEventListener(
          'popstate',
          () => {
            replacePath(defaultBackPath);
          },
          { once: true },
        );
      }, 0);
    } else if (!isHome) {
      historyStateQueue.back();
    }
  }, [getNavState, prependPathToHistory]);
}
