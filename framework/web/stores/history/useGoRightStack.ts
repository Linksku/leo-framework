import historyStateQueue from 'core/globalState/historyStateQueue';
import { useGetNavState } from 'stores/history/HistoryStore';
import { requestIdleCallback } from 'utils/requestIdleCallback';

export default function useGoRightStack(): Stable<() => void> {
  const getNavState = useGetNavState();

  // Handles bugs with going back twice before rerender
  let pendingNavTimer: number | null = null;
  return useCallback(() => {
    const {
      rightStack,
      isForwardHome,
    } = getNavState();

    if (pendingNavTimer != null) {
      return;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    pendingNavTimer = requestIdleCallback(() => {
      pendingNavTimer = null;
    }, { timeout: 1000 });

    if (rightStack) {
      if (!isForwardHome) {
        historyStateQueue.forward();
      } else {
        historyStateQueue.back();
      }
    }
  }, [getNavState]);
}
