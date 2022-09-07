import type { BackButtonListenerEvent } from '@capacitor/app';
import type { ParsedQuery } from 'query-string';
import qs from 'query-string';
import { App as Capacitor } from '@capacitor/app';

import useUpdate from 'utils/hooks/useUpdate';
import useEffectInitialMount from 'utils/hooks/useEffectInitialMount';
import useWindowEvent from 'utils/hooks/useWindowEvent';

type Direction = 'none' | 'back' | 'forward';

type NativeHistoryState = {
  id: number,
  path: string,
  queryStr: string | null,
  hash: string | null,
  prevId?: number,
  prevPath?: string,
  prevQueryStr?: string | null,
  prevHash?: string | null,
  direction: Direction,
};

export const FIRST_ID = 1;

function queryToStrVals(query: Partial<ParsedQuery<string | number>>) {
  const newQuery: ObjectOf<string | string[]> = {};
  for (const [k, v] of TS.objEntries(query)) {
    if (Array.isArray(v)) {
      newQuery[k] = v.map((v2: number | string | null) => `${v2 ?? ''}`);
    } else if (typeof v === 'number') {
      newQuery[k] = `${v}`;
    } else {
      newQuery[k] = v ?? '';
    }
  }
  return newQuery;
}

function historyStateToKey(
  id: number,
  path: string,
  queryStr: string | null,
  hash: string | null,
) {
  return `${id}|${path}?${queryStr ?? ''}#${hash ?? ''}`;
}

// Reduce rerenders.
const QS_CACHE: ObjectOf<Memoed<ObjectOf<string | string[]>>> = Object.create(null);
function getHistoryState(
  id: number,
  path: string,
  queryStr: string | null,
  hash: string | null,
): HistoryState {
  let query: Memoed<ObjectOf<string | string[]>> = EMPTY_OBJ;
  if (queryStr && !QS_CACHE[queryStr]) {
    query = markMemoed(queryToStrVals(qs.parse(queryStr)));
    QS_CACHE[queryStr] = query;
  }
  return markMemoed({
    id,
    path,
    query,
    queryStr: queryStr || null,
    hash,
    key: historyStateToKey(id, path, queryStr, hash),
  });
}

function getHistoryStateFromLocation(id: number) {
  const { pathname, search, hash } = window.location;
  let pathDecoded: string;
  try {
    pathDecoded = decodeURIComponent(pathname);
  } catch {
    pathDecoded = pathname;
  }
  return getHistoryState(
    id,
    pathDecoded,
    search || null,
    hash ? hash.slice(1) : null,
  );
}

function getFullPath(path: string, queryStr: string | null, hash: string | null) {
  let fullPath = path;
  if (queryStr) {
    fullPath += `?${queryStr}`;
  }
  if (hash) {
    fullPath += `#${hash}`;
  }
  return fullPath;
}

function getNativeHistoryState(
  curState: HistoryState,
  prevState: Nullish<HistoryState>,
  direction: Direction,
): NativeHistoryState {
  return {
    id: curState.id,
    path: curState.path,
    queryStr: curState.queryStr,
    hash: curState.hash,
    prevId: prevState?.id,
    prevPath: prevState?.path,
    prevQueryStr: prevState?.queryStr,
    prevHash: prevState?.hash,
    direction,
  };
}

export const [
  HistoryProvider,
  useHistoryStore,
  usePushPath,
  useReplacePath,
  useAddPopHandler,
] = constate(
  function HistoryStore() {
    const ref = useRef(useConst(() => {
      let nativeHistoryState: NativeHistoryState | undefined;
      try {
        nativeHistoryState = TS.assertType<NativeHistoryState>(
          val => typeof val === 'object' && val
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
            && ['none', 'back', 'forward'].includes(val.direction),
          window.history?.state,
        );
      } catch {}

      return {
        prevState: nativeHistoryState?.prevId && nativeHistoryState?.prevPath
          ? getHistoryState(
            nativeHistoryState.prevId,
            nativeHistoryState.prevPath,
            nativeHistoryState.prevQueryStr ?? null,
            nativeHistoryState.prevHash ?? null,
          )
          : null,
        curState: nativeHistoryState
          ? getHistoryState(
            nativeHistoryState.id,
            nativeHistoryState.path,
            nativeHistoryState.queryStr,
            nativeHistoryState.hash,
          )
          : getHistoryStateFromLocation(FIRST_ID),
        direction: nativeHistoryState?.direction ?? 'none',
        isReplaced: !!nativeHistoryState,
        didRefresh: !!nativeHistoryState,
        popHandlers: [] as (() => boolean)[],
        lastPopStateTime: Number.MIN_SAFE_INTEGER,
      };
    }));
    const update = useUpdate();

    const _pushPath = useCallback((
      _path: string,
      _query: Partial<ParsedQuery<string | number>> | null = null,
      _hash: string | null = null,
    ) => {
      const firstQuestion = _path.indexOf('?');
      const firstHash = _path.indexOf('#');
      const path = _path.replace(/[#?].*$/, '');

      if (!process.env.PRODUCTION && (
        (_query && firstQuestion >= 0)
        || (_hash && firstHash >= 0)
      )) {
        throw new Error(`pushPath(${_path}): don't include query/hash in path`);
      }

      let query: ObjectOf<string | string[]> | null = null;
      let queryStr: string | null = null;
      if (_query) {
        query = queryToStrVals(_query);
        queryStr = qs.stringify(query);
      } else if (firstQuestion >= 0) {
        if (firstHash < 0) {
          queryStr = _path.slice(firstQuestion + 1);
          query = queryToStrVals(qs.parse(queryStr));
        } else if (firstQuestion < firstHash) {
          queryStr = _path.slice(firstQuestion + 1, firstHash);
          query = queryToStrVals(qs.parse(queryStr));
        }
      }
      const hash = _hash
        ?? (firstHash >= 0 ? _path.slice(firstHash + 1) : '');

      if (path === ref.current.curState.path
        && queryStr === ref.current.curState.queryStr
        && hash === ref.current.curState.hash) {
        return;
      }

      ref.current = markMemoed({
        ...ref.current,
        prevState: ref.current.curState,
        curState: markMemoed({
          id: ref.current.curState.id + 1,
          path,
          query: query ? markMemoed(query) : EMPTY_OBJ,
          queryStr,
          hash,
          key: historyStateToKey(ref.current.curState.id + 1, path, queryStr, hash),
        }),
        direction: 'forward',
        isReplaced: false,
        didRefresh: false,
      });

      const newCurState = ref.current.curState;
      const newNativeState = getNativeHistoryState(
        newCurState,
        ref.current.prevState,
        ref.current.direction,
      );
      window.history.pushState(
        newNativeState,
        '',
        getFullPath(newCurState.path, newCurState.queryStr, newCurState.hash),
      );

      update();
    }, [update]);

    const _replacePath = useCallback((
      path: string,
      _query: Partial<ParsedQuery<string | number>> | null = null,
      hash: string | null = null,
    ) => {
      const query = _query ? queryToStrVals(_query) : null;
      const queryStr = query ? qs.stringify(query) : null;
      if (path === ref.current.curState.path
        && queryStr === ref.current.curState.queryStr
        && hash === ref.current.curState.hash) {
        return;
      }

      ref.current = markMemoed({
        ...ref.current,
        curState: markMemoed({
          id: ref.current.curState.id,
          path,
          query: query ? markMemoed(query) : EMPTY_OBJ,
          queryStr,
          hash,
          key: historyStateToKey(ref.current.curState.id, path, queryStr, hash),
        }),
        isReplaced: true,
        didRefresh: false,
      });

      const newCurState = ref.current.curState;
      const newNativeState = getNativeHistoryState(
        newCurState,
        ref.current.prevState,
        ref.current.direction,
      );
      window.history.replaceState(
        newNativeState,
        '',
        getFullPath(newCurState.path, newCurState.queryStr, newCurState.hash),
      );
      update();
    }, [update]);

    const _addPopHandler = useCallback((popHandler: () => boolean) => {
      ref.current.popHandlers.push(popHandler);
    }, []);

    // Called for both back and forward. event.state is current state.
    useWindowEvent('popstate', useCallback((event: PopStateEvent) => {
      const newStateId = typeof event.state?.id === 'number' ? event.state.id as number : FIRST_ID;
      if (event.state) {
        const _pushLastState = () => {
          window.history.pushState(
            getNativeHistoryState(
              ref.current.curState,
              ref.current.prevState,
              ref.current.direction,
            ),
            '',
            getFullPath(
              ref.current.curState.path,
              ref.current.curState.queryStr,
              ref.current.curState.hash,
            ),
          );
          update();
        };

        // Popped twice too quickly, for fixing swipe back gesture.
        // todo: mid/mid rapidly going back and forth breaks history
        if (performance.now() - ref.current.lastPopStateTime < 100) {
          _pushLastState();
        }

        while (ref.current.popHandlers.length) {
          const handler = ref.current.popHandlers.shift();
          if (handler?.()) {
            _pushLastState();
            return;
          }
        }
      } else {
        // Clear all pop handlers.
        while (ref.current.popHandlers.length) {
          const handler = ref.current.popHandlers.shift();
          handler?.();
        }
      }

      ref.current = markMemoed({
        ...ref.current,
        prevState: ref.current.curState,
        curState: newStateId === ref.current.prevState?.id
          ? ref.current.prevState
          : getHistoryStateFromLocation(newStateId),
        direction: newStateId >= ref.current.curState.id ? 'forward' : 'back',
        isReplaced: false,
        didRefresh: false,
        lastPopStateTime: performance.now(),
      });

      const newCurState = ref.current.curState;
      const newNativeState = getNativeHistoryState(
        newCurState,
        ref.current.prevState,
        ref.current.direction,
      );
      window.history.replaceState(
        newNativeState,
        '',
        getFullPath(newCurState.path, newCurState.queryStr, newCurState.hash),
      );

      update();
    }, [update]));

    useWindowEvent('click', useCallback((event: MouseEvent) => {
      const el = (event.target as HTMLElement).closest('a');
      const href = el?.getAttribute('href');

      if (!process.env.PRODUCTION && el) {
        throw new Error(`HistoryStore.handleClick: use <Link> instead of <a> for ${href}`);
      }

      if (href?.startsWith('/')) {
        event.preventDefault();

        _pushPath(href);
      }
    }, [_pushPath]));

    useEffect(() => {
      // Capacitor Android.
      const backButtonListener = Capacitor.addListener('backButton', (event: BackButtonListenerEvent) => {
        while (ref.current.popHandlers.length) {
          const handler = ref.current.popHandlers.shift();
          if (handler?.()) {
            return;
          }
        }

        if (event.canGoBack) {
          window.history.back();
        } else {
          wrapPromise(Capacitor.exitApp(), 'warn', 'Capacitor.exitApp');
        }
      });

      return () => {
        // Error if remove() is called before Capacitor loads
        backButtonListener.remove()
          .catch(NOOP);
      };
    }, [_replacePath, _pushPath]);

    // todo: low/mid scroll to hash in homewrap and stackwrap
    useEffectInitialMount(() => {
      if (ref.current.curState.hash) {
        document.getElementById(ref.current.curState.hash)?.scrollIntoView(true);
      }
    }, [ref.current.curState.hash]);

    return useDeepMemoObj({
      prevState: ref.current.prevState,
      curState: ref.current.curState,
      direction: ref.current.direction,
      isReplaced: ref.current.isReplaced,
      didRefresh: ref.current.didRefresh,
      _pushPath,
      _replacePath,
      _addPopHandler,
    });
  },
  function HistoryStore(val) {
    return val;
  },
  function PushPath(val) {
    return val._pushPath;
  },
  function ReplacePath(val) {
    return val._replacePath;
  },
  function AddPopHandler(val) {
    return val._addPopHandler;
  },
);
