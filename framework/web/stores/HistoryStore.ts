// Include in main bundle
import '@capacitor/app/dist/esm/web.js';

import useUpdate from 'hooks/useUpdate';
import useEffectInitialMount from 'hooks/useEffectInitialMount';
import useWindowEvent from 'hooks/useWindowEvent';
import getUrlParams from 'utils/getUrlParams';
import prefetchRoute from 'utils/prefetchRoute';
import stringifyUrlQuery from 'utils/stringifyUrlQuery';
import { ABSOLUTE_URL_REGEX } from 'consts/browsers';

type Direction = 'none' | 'back' | 'forward';

type NativeHistoryState = {
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

export const FIRST_ID = 1;

function queryStrToQuery(queryStr: string): Stable<ObjectOf<string | number>> {
  const params = getUrlParams(queryStr);
  const newQuery: ObjectOf<string | number> = Object.create(null);
  for (const pair of params.entries()) {
    newQuery[pair[0]] = pair[1];
  }
  return newQuery as Stable<ObjectOf<string | number>>;
}

function historyStateToKey(
  id: number,
  path: string,
  queryStr: Nullish<string>,
  hash: Nullish<string>,
) {
  return `${id}:${path}?${queryStr ?? ''}#${hash ?? ''}`;
}

// Reduce rerenders.
const QS_CACHE: Map<string, Stable<ObjectOf<string | number>>> = new Map();
const HISTORY_STATE_MEMO: Map<string, HistoryState> = new Map();
function buildHistoryState({
  id,
  path,
  query,
  queryStr,
  hash,
}: {
  id: number,
  path: string,
  query?: ObjectOf<string | number> | null,
  queryStr: Nullish<string>,
  hash: Nullish<string>,
}): HistoryState {
  const key = historyStateToKey(id, path, queryStr, hash);
  if (!HISTORY_STATE_MEMO.has(key)) {
    if (!query && queryStr && !QS_CACHE.has(queryStr)) {
      QS_CACHE.set(queryStr, queryStrToQuery(queryStr));
    }
    HISTORY_STATE_MEMO.set(key, markStable({
      id,
      path,
      query: markStable(query)
        ?? (queryStr ? QS_CACHE.get(queryStr) : null)
        ?? EMPTY_OBJ,
      queryStr: queryStr || null,
      hash: hash || null,
      key,
    }));
  }

  return TS.defined(HISTORY_STATE_MEMO.get(key));
}

function buildHistoryStateFromLocation(id: number): HistoryState {
  const { pathname, search, hash } = window.location;
  let pathDecoded = pathname;
  try {
    pathDecoded = decodeURIComponent(pathname);
  } catch {}

  return buildHistoryState({
    id,
    path: pathDecoded,
    queryStr: search?.slice(1) || null,
    hash: hash?.slice(1) || null,
  });
}

function getPath(path: string, queryStr: string | null, hash: string | null) {
  let newPath = path;
  if (queryStr) {
    newPath += `?${queryStr}`;
  }
  if (hash) {
    newPath += `#${hash}`;
  }
  return newPath;
}

function getFullPath(path: string, queryStr: string | null, hash: string | null) {
  return window.location.origin + getPath(path, queryStr, hash);
}

export function getPathFromState(state: HistoryState) {
  return getPath(state.path, state.queryStr, state.hash);
}

function getFullPathFromState(state: HistoryState) {
  return getFullPath(state.path, state.queryStr, state.hash);
}

function getNativeHistoryState({
  curState,
  backState,
  forwardState,
  direction,
}: {
  curState: HistoryState,
  backState: Nullish<HistoryState>,
  forwardState: Nullish<HistoryState>,
  direction: Direction,
}): NativeHistoryState {
  return {
    id: curState.id,
    path: curState.path,
    queryStr: curState.queryStr,
    hash: curState.hash,
    backId: backState?.id,
    backPath: backState?.path,
    backQueryStr: backState?.queryStr,
    backHash: backState?.hash,
    forwardId: forwardState?.id,
    forwardPath: forwardState?.path,
    forwardQueryStr: forwardState?.queryStr,
    forwardHash: forwardState?.hash,
    direction,
  };
}

export function getPartsFromPath(
  _path: string,
  query: ObjectOf<string | number> | null = null,
  _hash: string | null = null,
) {
  const questionIdx = _path.indexOf('?');
  const hashIdx = _path.indexOf('#');
  const path = _path.slice(
    0,
    Math.min(
      questionIdx >= 0 ? questionIdx : Number.POSITIVE_INFINITY,
      hashIdx >= 0 ? hashIdx : Number.POSITIVE_INFINITY,
    ),
  );

  if (!process.env.PRODUCTION && (
    (query && questionIdx >= 0)
    || (_hash && hashIdx >= 0)
  )) {
    throw new Error(`getPartsFromPath(${_path}): don't include query/hash in path`);
  }

  let queryStr: string | null = null;
  if (query) {
    queryStr = stringifyUrlQuery(query);
  } else if (questionIdx >= 0) {
    if (hashIdx < 0) {
      queryStr = _path.slice(questionIdx + 1);
      query = queryStrToQuery(queryStr);
    } else if (questionIdx < hashIdx) {
      queryStr = _path.slice(questionIdx + 1, hashIdx);
      query = queryStrToQuery(queryStr);
    }
  }
  const hash = _hash
    ?? (hashIdx >= 0 ? _path.slice(hashIdx + 1) : null);

  return {
    path,
    query,
    queryStr,
    hash,
  };
}

let HistoryState = (() => {
  let nativeHistoryState: NativeHistoryState | undefined;
  try {
    nativeHistoryState = TS.assertType<NativeHistoryState>(
      window.history?.state,
      val => TS.isObj(val)
        && typeof val.id === 'number'
        && typeof val.path === 'string'
        && (val.queryStr === null || typeof val.queryStr === 'string')
        && (val.hash === null || typeof val.hash === 'string')
        && (
          (
            val.prevId === undefined
            && val.prevPath === undefined
            && val.prevQueryStr === undefined
            && val.prevHash === undefined
          )
          || (
            typeof val.prevId === 'number'
            && typeof val.prevPath === 'string'
            && (val.prevQueryStr === null || typeof val.queryStr === 'string')
            && (val.prevHash === null || typeof val.prevHash === 'string')
          )
        )
        && typeof val.direction === 'string'
        && TS.includes(['none', 'back', 'forward'], val.direction),
    );
  } catch {}

  // Note: if exited app and then returned via back, we can go forward out of app
  /*
  // Either exited app and then returned via back or refreshed
  const didNavigateBackToApp = !!nativeHistoryState?.forwardId && nativeHistoryState?.direction === 'back';
  */
  return {
    curState: nativeHistoryState
      ? buildHistoryState({
        id: nativeHistoryState.id,
        path: nativeHistoryState.path,
        queryStr: nativeHistoryState.queryStr,
        hash: nativeHistoryState.hash,
      })
      // FIRST_ID is for prepending home to stack
      : buildHistoryStateFromLocation(
        window.location.pathname === '/'
          ? FIRST_ID
          : FIRST_ID + 1,
      ),
    backState: nativeHistoryState?.backId && nativeHistoryState?.backPath
      ? buildHistoryState({
        id: nativeHistoryState.backId,
        path: nativeHistoryState.backPath,
        queryStr: nativeHistoryState.backQueryStr,
        hash: nativeHistoryState.backHash,
      })
      : null,
    forwardState: nativeHistoryState?.forwardId && nativeHistoryState?.forwardPath
      ? buildHistoryState({
        id: nativeHistoryState.forwardId,
        path: nativeHistoryState.forwardPath,
        queryStr: nativeHistoryState.forwardQueryStr,
        hash: nativeHistoryState.forwardHash,
      })
      : null,
    direction: nativeHistoryState?.direction ?? 'none',
    isReplaced: !!nativeHistoryState,
    popHandlers: [] as unknown as Stable<(() => boolean)[]>,
    lastPopStateTime: Number.MIN_SAFE_INTEGER,
    // After navigating back and un-suspending, WDYR would consider context unchanged
    navCountHack: 0,
  };
})();

export function getHistoryState() {
  return HistoryState;
}

export const [
  HistoryProvider,
  useHistoryStore,
  usePushPath,
  useReplacePath,
  useAddPopHandler,
] = constate(
  function HistoryStore() {
    const update = useUpdate();

    const pushPath = useCallback((
      _path: string,
      _query: ObjectOf<string | number> | null = null,
      _hash: string | null = null,
    ) => {
      const {
        path,
        query,
        queryStr,
        hash,
      } = getPartsFromPath(_path, _query, _hash);
      const {
        curState,
        backState,
        forwardState,
        navCountHack,
      } = HistoryState;

      if (path === curState.path
        && queryStr === curState.queryStr
        && hash === curState.hash) {
        return;
      }

      if (path === backState?.path
        && queryStr === backState.queryStr
        && hash === backState.hash
        // todo: low/mid only disallow back if home was auto-added
        && backState.id !== FIRST_ID) {
        window.history.back();
        return;
      }

      const newCurState = path === forwardState?.path
        && queryStr === forwardState.queryStr
        && hash === forwardState.hash
        ? forwardState
        : buildHistoryState({
          id: curState.id + 1,
          path,
          query,
          queryStr,
          hash,
        });
      const newBackState = curState;

      window.history.replaceState(
        getNativeHistoryState({
          curState,
          backState,
          forwardState: newCurState,
          direction: 'forward',
        }),
        '',
        getFullPathFromState(curState),
      );

      prefetchRoute(newCurState.path);
      HistoryState = markStable({
        ...HistoryState,
        curState: newCurState,
        backState: newBackState,
        forwardState: null,
        direction: 'forward',
        isReplaced: false,
        navCountHack: navCountHack + 1,
        popHandlers: [] as unknown as Stable<(() => boolean)[]>,
      });
      window.history.pushState(
        getNativeHistoryState({
          curState: newCurState,
          backState: newBackState,
          forwardState: null,
          direction: 'forward',
        }),
        '',
        getFullPathFromState(newCurState),
      );

      update();
    }, [update]);

    const replacePath = useCallback((
      _path: string,
      _query: ObjectOf<string | number> | null = null,
      _hash: string | null = null,
    ) => {
      const {
        path,
        query,
        queryStr,
        hash,
      } = getPartsFromPath(_path, _query, _hash);
      const {
        curState,
        backState,
        forwardState,
        direction,
        navCountHack,
      } = HistoryState;
      if (path === curState.path
        && queryStr === curState.queryStr
        && hash === curState.hash) {
        return;
      }

      const newCurState = buildHistoryState({
        id: curState.id,
        path,
        query,
        queryStr,
        hash,
      });
      HistoryState = markStable({
        ...HistoryState,
        curState: newCurState,
        isReplaced: true,
        navCountHack: navCountHack + 1,
      });

      prefetchRoute(newCurState.path);
      window.history.replaceState(
        getNativeHistoryState({
          curState: newCurState,
          backState,
          forwardState,
          direction,
        }),
        '',
        getFullPathFromState(newCurState),
      );

      update();
    }, [update]);

    const addHomeToHistory = useCallback(() => {
      const {
        curState,
        backState,
        forwardState,
        navCountHack,
        direction,
      } = HistoryState;

      if (backState) {
        if (!process.env.PRODUCTION) {
          ErrorLogger.warn(new Error('HistoryStore.addHomeToHistory: backState already exists'));
        }
        return;
      }

      if (!process.env.PRODUCTION && curState.id <= FIRST_ID) {
        // todo: low/mid clicking back multiple times quickly can cause invalid state id
        throw new Error(`HistoryStore.addHomeToHistory: invalid state id: ${curState.id}`);
      }

      const newBackState = buildHistoryState({
        id: curState.id - 1,
        path: '/',
        queryStr: null,
        hash: null,
      });

      window.history.replaceState(
        getNativeHistoryState({
          curState: newBackState,
          backState: null,
          forwardState: curState,
          direction: 'none',
        }),
        '',
        getFullPath('/', null, null),
      );

      HistoryState = markStable({
        ...HistoryState,
        backState: newBackState,
        isReplaced: true,
        navCountHack: navCountHack + 1,
      });
      window.history.pushState(
        getNativeHistoryState({
          curState,
          backState: newBackState,
          forwardState,
          direction,
        }),
        '',
        getFullPathFromState(curState),
      );

      update();
    }, [update]);

    const addPopHandler = useCallback((popHandler: () => boolean) => {
      HistoryState.popHandlers.push(popHandler);
    }, []);

    // Called for both back and forward. event.state is current state.
    useWindowEvent('popstate', useCallback((event: PopStateEvent) => {
      const {
        curState,
        backState,
        forwardState,
        direction,
        popHandlers,
        lastPopStateTime,
        navCountHack,
      } = HistoryState;
      const newStateId = TS.isObj(event.state) && typeof event.state.id === 'number'
        ? event.state.id
        : FIRST_ID;
      const newDirection = newStateId >= curState.id ? 'forward' : 'back';

      function _pushLastState() {
        window.history.pushState(
          getNativeHistoryState({
            curState,
            backState,
            forwardState,
            direction,
          }),
          '',
          getFullPathFromState(curState),
        );
        update();
      }

      // Popped twice too quickly, for fixing swipe back gesture.
      if (newDirection === 'back' && performance.now() - lastPopStateTime < 100) {
        _pushLastState();
        return;
      }

      const nativeHistoryState = event.state as Nullish<NativeHistoryState>;
      if (nativeHistoryState) {
        while (popHandlers.length) {
          const handler = popHandlers.shift();
          if (handler?.()) {
            _pushLastState();
            return;
          }
        }
      } else {
        // Clear all pop handlers.
        while (popHandlers.length) {
          const handler = popHandlers.shift();
          handler?.();
        }
      }

      let newCurState: HistoryState;
      let newBackState: HistoryState | null = null;
      let newForwardState: HistoryState | null = null;
      if (newDirection === 'back' && (!nativeHistoryState
        || (backState
          && backState.id === nativeHistoryState.id
          && backState.path === nativeHistoryState.path
          && backState.queryStr === nativeHistoryState.queryStr
          && backState.hash === nativeHistoryState.hash
        ))) {
        newCurState = TS.notNull(backState);
        newForwardState = curState;
        newBackState = nativeHistoryState?.backId && nativeHistoryState?.backPath
          ? buildHistoryState({
            id: nativeHistoryState.backId,
            path: nativeHistoryState.backPath,
            queryStr: nativeHistoryState.backQueryStr,
            hash: nativeHistoryState.backHash,
          })
          : null;
      } else if (newDirection === 'forward' && (!nativeHistoryState
        || (forwardState
          && forwardState.id === nativeHistoryState.id
          && forwardState.path === nativeHistoryState.path
          && forwardState.queryStr === nativeHistoryState.queryStr
          && forwardState.hash === nativeHistoryState.hash
        ))) {
        newCurState = forwardState
          ?? (nativeHistoryState
            ? buildHistoryState({
              id: nativeHistoryState.id,
              path: nativeHistoryState.path,
              queryStr: nativeHistoryState.queryStr,
              hash: nativeHistoryState.hash,
            })
            : buildHistoryStateFromLocation(newStateId));
        newBackState = curState;
        newForwardState = nativeHistoryState?.forwardId && nativeHistoryState?.forwardPath
          ? buildHistoryState({
            id: nativeHistoryState.forwardId,
            path: nativeHistoryState.forwardPath,
            queryStr: nativeHistoryState.forwardQueryStr,
            hash: nativeHistoryState.forwardHash,
          })
          : null;
      } else if (nativeHistoryState) {
        // Could be caused by popping more than 1 history item at once
        if (!process.env.PRODUCTION) {
          ErrorLogger.warn(
            new Error('HistoryStore.popstate: mismatched state'),
            {
              newDirection,
              nativeHistoryState,
              curState,
              backState,
              forwardState,
            },
          );
        }

        newCurState = buildHistoryState({
          id: nativeHistoryState.id,
          path: nativeHistoryState.path,
          queryStr: nativeHistoryState.queryStr,
          hash: nativeHistoryState.hash,
        });
        newBackState = nativeHistoryState.backId && nativeHistoryState.backPath
          ? buildHistoryState({
            id: nativeHistoryState.backId,
            path: nativeHistoryState.backPath,
            queryStr: nativeHistoryState.backQueryStr,
            hash: nativeHistoryState.backHash,
          })
          : null;
        newForwardState = nativeHistoryState.forwardId && nativeHistoryState.forwardPath
          ? buildHistoryState({
            id: nativeHistoryState.forwardId,
            path: nativeHistoryState.forwardPath,
            queryStr: nativeHistoryState.forwardQueryStr,
            hash: nativeHistoryState.forwardHash,
          })
          : null;
      } else {
        throw getErr('HistoryStore.popstate: unexpected state', {
          newDirection,
          nativeHistoryState,
          curState,
          backState,
          forwardState,
        });
      }

      HistoryState = markStable({
        ...HistoryState,
        curState: newCurState,
        backState: newBackState,
        forwardState: newForwardState,
        direction: newDirection,
        isReplaced: false,
        lastPopStateTime: performance.now(),
        navCountHack: navCountHack + 1,
      });
      window.history.replaceState(
        getNativeHistoryState({
          curState: newCurState,
          backState: newBackState,
          forwardState: newForwardState,
          direction: newDirection,
        }),
        '',
        getFullPathFromState(newCurState),
      );

      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
        if (navigator.virtualKeyboard) {
          navigator.virtualKeyboard.hide();
        }
      }

      update();
    }, [update]));

    useWindowEvent('click', useCallback((event: MouseEvent) => {
      const el = (event.target as HTMLElement).closest('a');
      const href = el?.getAttribute('href');

      if (!el || !href) {
        return;
      }

      if (!process.env.PRODUCTION) {
        throw new Error(`HistoryStore.handleClick: use <Link> instead of <a> for ${href}`);
      }

      if (href && !ABSOLUTE_URL_REGEX.test(href)) {
        event.preventDefault();

        pushPath(href);
      }
    }, [pushPath]));

    useEffectInitialMount(() => {
      const {
        curState,
        backState,
        forwardState,
        direction,
      } = HistoryState;

      window.history.replaceState(
        getNativeHistoryState({
          curState,
          backState,
          forwardState,
          direction,
        }),
        '',
        getFullPathFromState(curState),
      );

      if (!backState && curState.path !== '/') {
        // Note: doesn't always work, especially is user hasn't interacted with the page.
        // todo: low/mid add home to history after user takes action
        addHomeToHistory();
      }

      // todo: low/mid scroll to hash in homewrap and stackwrap
      // Note: this doesn't work for deferred components,
      // also may show blank space outside overflow: hidden
      // document.getElementById(curState.hash)?.scrollIntoView(true);
    });

    const {
      curState,
      backState,
      forwardState,
      direction,
      isReplaced,
      navCountHack,
      popHandlers,
    } = HistoryState;
    return useMemo(
      () => ({
        curState,
        backState,
        forwardState,
        prevState: direction === 'forward'
          ? backState
          : (direction === 'back' ? forwardState : null),
        nextState: direction === 'forward'
          ? forwardState
          : (direction === 'back' ? backState : null),
        direction,
        isReplaced,
        navCountHack,
        popHandlers,
        pushPath,
        replacePath,
        addHomeToHistory,
        addPopHandler,
      }),
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [
        curState,
        backState,
        forwardState,
        direction,
        isReplaced,
        navCountHack,
        pushPath,
        replacePath,
        addHomeToHistory,
        popHandlers,
        addPopHandler,
      ],
    );
  },
  function HistoryStore(val) {
    return val;
  },
  function PushPath(val) {
    return val.pushPath;
  },
  function ReplacePath(val) {
    return val.replacePath;
  },
  function AddPopHandler(val) {
    return val.addPopHandler;
  },
);
