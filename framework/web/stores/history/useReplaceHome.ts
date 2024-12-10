import type { HomeTab } from 'config/homeTabs';
import { useGetNavState, FIRST_ID } from 'stores/history/HistoryStore';
import { getPartsFromPath } from 'stores/history/historyStoreHelpers';
import { DEFAULT_PATH_PARTS } from 'config/homeTabs';
import shallowEqual from 'utils/shallowEqual';
import { getHomePathParts } from 'stores/history/getComputedNavState';
import historyStateQueue from 'core/globalState/historyStateQueue';

export default function useReplaceHome() {
  const getNavState = useGetNavState();
  const pushPath = usePushPath();
  const replacePath = useReplacePath();

  return useCallback((
    newHomeTab: HomeTab,
    newParts?: string | string[],
    newQuery: ObjectOf<string | number> | null = null,
    newHash: string | null = null,
  ) => {
    const {
      backStates,
      direction,
      prevState,
      lastHomeState,
      isHome,
      isPrevHome,
      homeTab,
      homeParts,
    } = getNavState();

    if (!newParts) {
      newParts = EMPTY_ARR;
    } else if (typeof newParts === 'string') {
      newParts = [newParts];
    }

    let newPath: string;
    if (newHomeTab === DEFAULT_PATH_PARTS[0]
      && newParts.every((part, idx) => part === DEFAULT_PATH_PARTS[idx + 1])) {
      newPath = '/';
    } else {
      newPath = `/${newHomeTab}/${newParts.join('/')}`;
    }

    if (!isHome || !isPrevHome || !backStates.length) {
      pushPath(newPath, newQuery, newHash);
      return;
    }

    const {
      path,
      queryStr,
      hash,
    } = getPartsFromPath(newPath, newQuery, newHash);
    if (path === prevState?.path
      && queryStr === prevState?.queryStr
      && hash === prevState?.hash) {
      if (direction === 'back') {
        historyStateQueue.forward();
      } else {
        historyStateQueue.back();
      }
      return;
    }

    const isOnlyTabChanging = newHomeTab !== homeTab
      && shallowEqual(newParts, homeParts);
    const {
      homeTab: lastHomeTab,
      homeParts: lastHomeParts,
    } = getHomePathParts(lastHomeState?.path);
    const prevIsOnlyTabChanging = homeTab !== lastHomeTab
      && (prevState?.id === FIRST_ID || shallowEqual(homeParts, lastHomeParts));
    if (isOnlyTabChanging && prevIsOnlyTabChanging) {
      replacePath(newPath, newQuery, newHash);
    } else {
      pushPath(newPath, newQuery, newHash);
    }
  }, [getNavState, pushPath, replacePath]);
}
