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
  prevState: HistoryState | null,
  nextState: HistoryState | null,
  isInitialLoad: boolean,
  replacedNavCount: number | null,
  popHandlers: Stable<(() => boolean)[]>,
  lastPopStateTime: number,
  navCount: number,
};

export type NavState = Stable<BaseHistoryState>;
