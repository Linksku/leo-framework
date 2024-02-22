import type { HomeTab } from 'config/homeTabs';
import useUpdatedState from 'hooks/useUpdatedState';
import usePreviousDifferent from 'hooks/usePreviousDifferent';
import useShallowMemoArr from 'hooks/useShallowMemoArr';
import { FIRST_ID, getPartsFromPath } from 'stores/HistoryStore';
import { DEFAULT_PATH_PARTS } from 'config/homeTabs';
import shallowEqual from 'utils/shallowEqual';

const HOME_TABS_SET = new Set<string>(Object.values(HOME_TABS));
function _isPathHome(path: string | undefined): boolean {
  if (path == null) {
    return false;
  }
  if (path === '/' || path === '') {
    return true;
  }
  const pathParts = path.split('/', 2);
  return HOME_TABS_SET.has(
    pathParts[0] === '' ? pathParts[1] : pathParts[0],
  );
}

export const [
  HomeNavProvider,
  useHomeNavStore,
  useHomeTab,
  useHomeParts,
  useIsHome,
  useReplaceHome,
] = constate(
  function HomeNavStore() {
    const {
      curState,
      backState,
      forwardState,
      prevState,
      nextState,
      direction,
      navCountHack,
      pushPath,
      replacePath,
    } = useHistoryStore();

    const isHome = useMemo(
      () => _isPathHome(curState.path),
      [curState.path],
    );
    const isBackHome = useMemo(
      () => _isPathHome(backState?.path),
      [backState?.path],
    );
    const isForwardHome = useMemo(
      () => _isPathHome(forwardState?.path),
      [forwardState?.path],
    );
    const isPrevHome = prevState === forwardState ? isForwardHome : isBackHome;
    const isNextHome = nextState === forwardState ? isForwardHome : isBackHome;

    // todo: low/mid fix flicker when going home -> stack -> home -> back
    const homeState = useUpdatedState<HistoryState | null>(
      null,
      s => {
        if (_isPathHome(curState.path)) {
          return curState;
        }
        if (isBackHome) {
          return backState;
        }
        if (isForwardHome) {
          return forwardState;
        }
        return s;
      },
    );
    const homePathParts = useMemo(() => {
      if (!homeState?.path) {
        return [];
      }
      return (homeState.path.startsWith('/') ? homeState.path.slice(1) : homeState.path)
        .split('/');
    }, [homeState?.path]);
    const homeTab = homePathParts?.[0] === ''
      ? HOME_TABS.FEED
      : homePathParts?.[0] as HomeTab | undefined;
    const homeParts = useShallowMemoArr(
      homePathParts?.[0] && homePathParts?.length >= 2
        ? homePathParts.slice(1)
        : EMPTY_ARR,
    );
    const {
      homeTab: prevHomeTab,
      homeParts: prevHomeParts,
    } = usePreviousDifferent({
      homeTab,
      homeParts,
    }, true) ?? {};

    const replaceHome = useLatestCallback((
      newHomeTab: HomeTab,
      newParts?: string | string[],
      newQuery: ObjectOf<string | number> | null = null,
      newHash: string | null = null,
    ) => {
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

      if (!isHome) {
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
          window.history.forward();
        } else {
          window.history.back();
        }
        return;
      }
      if (curState.id === FIRST_ID || !isPrevHome) {
        pushPath(newPath, newQuery, newHash);
        return;
      }

      const isOnlyTabChanging = newHomeTab !== homeTab
        && shallowEqual(newParts, homeParts);
      const prevIsOnlyTabChanging = homeTab !== prevHomeTab
        && (prevState?.id === FIRST_ID || shallowEqual(homeParts, prevHomeParts));
      if (isOnlyTabChanging && prevIsOnlyTabChanging) {
        replacePath(newPath, newQuery, newHash);
      } else {
        pushPath(newPath, newQuery, newHash);
      }
    });

    const deferredHomeTab = useDeferredValue(homeTab);
    const deferredHomeParts = useDeferredValue(homeParts);
    const deferredIsHome = useDeferredValue(isHome);
    return useMemo(() => ({
      homeState,
      homeTab,
      prevHomeTab,
      homeParts,
      prevHomeParts,
      isHome,
      isBackHome,
      isForwardHome,
      isPrevHome,
      isNextHome,
      replaceHome,
      navCountHack,
      _deferredHomeTab: deferredHomeTab,
      _deferredHomeParts: deferredHomeParts,
      _deferredIsHome: deferredIsHome,
    }), [
      homeState,
      homeTab,
      prevHomeTab,
      homeParts,
      prevHomeParts,
      isHome,
      isBackHome,
      isForwardHome,
      isPrevHome,
      isNextHome,
      navCountHack,
      replaceHome,
      deferredHomeTab,
      deferredHomeParts,
      deferredIsHome,
    ]);
  },
  function HomeNavStore(val) {
    return val;
  },
  function HomeTab(val) {
    return val._deferredHomeTab;
  },
  function HomeParts(val) {
    return val._deferredHomeParts;
  },
  function IsHome(val) {
    return val._deferredIsHome;
  },
  function ReplaceHome(val) {
    return val.replaceHome;
  },
);
