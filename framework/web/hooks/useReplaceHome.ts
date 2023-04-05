import shallowEqual from 'utils/shallowEqual';
import { FIRST_ID } from 'stores/HistoryStore';
import { DEFAULT_PATH_PARTS } from 'config/homeTabs';

export default function useReplaceHome() {
  const pushPath = usePushPath();
  const replacePath = useReplacePath();
  const { prevState, curState, direction } = useHistoryStore();
  const {
    isHome,
    wasHome,
    homeTab,
    prevHomeTab,
    homeParts,
    prevHomeParts,
  } = useHomeNavStore();

  return useCallback((
    newHomeTab: ValueOf<typeof HOME_TABS>,
    ...newParts: string[]
  ) => {
    let newPath: string;
    if (newHomeTab === DEFAULT_PATH_PARTS[0]
      && newParts.every((part, idx) => part === DEFAULT_PATH_PARTS[idx + 1])) {
      newPath = '/';
    } else {
      newPath = `/${newHomeTab}/${newParts.join('/')}`;
    }

    if (!isHome) {
      pushPath(newPath);
      return;
    }
    if (newPath === curState.path && !Object.keys(curState.query).length && !curState?.hash) {
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
    curState.path,
    curState.query,
    curState.hash,
    curState.id,
    prevState?.hash,
    prevState?.path,
    prevState?.query,
    direction,
  ]);
}
