import usePrependPathToHistory from 'stores/history/usePrependPathToHistory';
import useEffectInitialMount from 'utils/useEffectInitialMount';
import { FIRST_ID, useGetNavState } from 'stores/history/HistoryStore';

export default function PrependHomeToHistoryHandler() {
  const getNavState = useGetNavState();
  const prependPathToHistory = usePrependPathToHistory();

  useEffectInitialMount(() => {
    const {
      curState,
      backStates,
    } = getNavState();

    if (!backStates.length && curState.path !== '/' && curState.id === FIRST_ID) {
      // Note: doesn't always work, especially is user hasn't interacted with the page.
      // todo: low/mid add home to history after user takes action
      prependPathToHistory('/');
    }
  });

  return null;
}
