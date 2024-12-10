import type { HomeTab } from 'config/homeTabs';
import type { BaseHistoryState, ComputedNavState } from './historyStoreTypes';

const HOME_TABS_SET = new Set<string>(Object.values(HOME_TABS));
function isPathHome(path: string | undefined): boolean {
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

export function getHomePathParts(path: Nullish<string>): {
  homeTab: HomeTab | null,
  homeParts: string[],
} {
  const homePathParts = path
    ? (path.startsWith('/') ? path.slice(1) : path).split('/')
    : [];
  const homeTab = homePathParts[0] === ''
    ? HOME_TABS.FEED
    : (homePathParts[0] as HomeTab | undefined) ?? null;
  const homeParts = homePathParts && homePathParts[0] && homePathParts.length >= 2
    && !(homePathParts.length === 2 && homePathParts[1] === '')
    ? homePathParts.slice(1)
    : EMPTY_ARR;
  return { homeTab, homeParts };
}

export default function getComputedNavState(
  {
    curState,
    backStates,
    forwardStates,
    direction,
  }: BaseHistoryState,
  prevNavState: ComputedNavState | null,
): ComputedNavState {
  const backState = backStates.at(0) ?? null;
  const forwardState = forwardStates.at(0) ?? null;

  // Home
  const isHome = isPathHome(curState.path);
  const isBackHome = isPathHome(backState?.path);
  const isForwardHome = isPathHome(forwardState?.path);
  const prevState = direction === 'forward'
    ? backState
    : (direction === 'back' ? forwardState : null);
  const nextState = direction === 'forward'
    ? forwardState
    : (direction === 'back' ? backState : null);
  const isPrevHome = prevState === forwardState ? isForwardHome : isBackHome;
  const isNextHome = nextState === forwardState ? isForwardHome : isBackHome;

  let lastHomeState = null;
  if (isHome) {
    lastHomeState = curState;
  } else if (isBackHome) {
    lastHomeState = backState;
  } else if (isForwardHome) {
    lastHomeState = forwardState;
  } else {
    lastHomeState = prevNavState?.lastHomeState ?? null;
  }

  const { homeTab, homeParts } = getHomePathParts(lastHomeState?.path);

  // Stacks
  const curStack = curState;
  let leftStack: HistoryState | null = null;
  let rightStack: HistoryState | null = null;
  if (isHome) {
    if (prevState && !isPrevHome) {
      // stack -> HOME
      // HOME <- stack
      rightStack = prevState;
    } else if (isPrevHome && nextState && !isNextHome) {
      // home -> HOME -> stack
      // stack <- HOME <- home
      rightStack = nextState;
    }
  } else {
    leftStack = backState;

    if (forwardState && !isForwardHome) {
      rightStack = forwardState;
    }
  }

  return {
    prevState,
    nextState,
    lastHomeState,
    homeTab,
    homeParts,
    isHome,
    isBackHome,
    isForwardHome,
    isPrevHome,
    isNextHome,
    curStack,
    leftStack,
    rightStack,
  };
}
