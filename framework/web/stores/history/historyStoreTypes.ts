import type { HomeTab } from 'config/homeTabs';

export type NativeHistoryState = {
  id: number,
  path: string,
  queryStr: string | null,
  hash: string | null,
  backId?: number,
  backPath?: string,
  backQueryStr?: string | null,
  backHash?: string | null,
  forwardId?: number,
  forwardPath?: string,
  forwardQueryStr?: string | null,
  forwardHash?: string | null,
  direction: Direction,
};

export type NativeHistoryStatePart = Pick<
  NativeHistoryState,
  'id' | 'path' | 'queryStr' | 'hash'
>;

export type Direction = 'none' | 'back' | 'forward';

export type BaseHistoryState ={
  curState: HistoryState,
  backStates: Stable<HistoryState[]>,
  forwardStates: Stable<HistoryState[]>,
  direction: Direction,
  isInitialLoad: boolean,
  replacedNavCount: number | null,
  popHandlers: Stable<(() => boolean)[]>,
  lastPopStateTime: number,
  navCount: number,
};

export type ComputedNavState = {
  prevState: HistoryState | null,
  nextState: HistoryState | null,
  lastHomeState: HistoryState | null,
  homeTab: HomeTab | null,
  homeParts: string[],
  isHome: boolean,
  isBackHome: boolean,
  isForwardHome: boolean,
  isPrevHome: boolean,
  isNextHome: boolean,
  curStack: HistoryState,
  leftStack: HistoryState | null,
  rightStack: HistoryState | null,
};

export type NavState = Stable<BaseHistoryState & ComputedNavState>;
