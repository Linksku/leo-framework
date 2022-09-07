import HOME_TABS from 'config/homeTabs';
import shallowEqual from 'utils/shallowEqual';
import { FIRST_ID } from 'stores/HistoryStore';

export default function useReplaceHome() {
  const pushPath = usePushPath();
  const replacePath = useReplacePath();
  const { prevState, curState, direction } = useHistoryStore();
  const { isHome, wasHome, homeTab, prevHomeTab, homeParts, prevHomeParts } = useHomeNavStore();

  return useCallback((
    newHomeTab: ValueOf<typeof HOME_TABS>,
    ...newParts: string[]
  ) => {
    let newPath = `/${newHomeTab}`;
    if (newParts.length) {
      newPath += `/${newParts.join('/')}`;
    } else if (newHomeTab === HOME_TABS.FEED) {
      newPath = '/';
    }

    if (!isHome) {
      pushPath(newPath);
      return;
    }
    if (newPath === prevState?.path && !Object.keys(prevState.query).length && !prevState?.hash) {
      if (direction === 'back') {
        window.history.forward();
      } else {
        window.history.back();
      }
      return;
    }
    if (curState.id === FIRST_ID || !wasHome) {
      pushPath(newPath);
      return;
    }

    const isTabChanging = newHomeTab !== homeTab;
    const isPartsChanging = !shallowEqual(newParts, homeParts);
    const prevIsTabChanging = homeTab !== prevHomeTab;
    const prevIsPartsChanging = !shallowEqual(homeParts, prevHomeParts);
    if ((isTabChanging && prevIsPartsChanging) || (isPartsChanging && prevIsTabChanging)) {
      pushPath(newPath);
    } else {
      replacePath(newPath);
    }
  }, [
    pushPath,
    replacePath,
    homeTab,
    homeParts,
    isHome,
    wasHome,
    prevHomeParts,
    prevHomeTab,
    curState.id,
    prevState?.hash,
    prevState?.path,
    prevState?.query,
    direction,
  ]);
}
