import type { BackButtonListenerEvent } from '@capacitor/app';
import type { ParsedQuery } from 'query-string';
import qs from 'query-string';
import { App as Capacitor } from '@capacitor/app';

import useUpdate from 'utils/hooks/useUpdate';
import useEffectInitialMount from 'utils/hooks/useEffectInitialMount';

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
          : getHistoryStateFromLocation(0),
        direction: nativeHistoryState?.direction ?? 'none',
        isReplaced: !!nativeHistoryState,
        didRefresh: !!nativeHistoryState,
        popHandlers: [] as (() => boolean)[],
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
          path,
          query: query ? markMemoed(query) : EMPTY_OBJ,
          queryStr,
          hash,
          id: ref.current.curState.id + 1,
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
          path,
          query: query ? markMemoed(query) : EMPTY_OBJ,
          queryStr,
          hash,
          id: ref.current.curState.id,
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

    // Called for both back and forward.
    const handlePopState = useCallback((event: PopStateEvent) => {
      const poppedStateId: number = typeof event.state?.id === 'number' ? event.state.id : 0;
      ref.current = markMemoed({
        ...ref.current,
        prevState: ref.current.curState,
        curState: poppedStateId === ref.current.prevState?.id
          ? ref.current.prevState
          : getHistoryStateFromLocation(poppedStateId),
        direction: poppedStateId >= ref.current.curState.id ? 'forward' : 'back',
        isReplaced: false,
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

      // Can't cancel pop event, so clear all pop handlers.
      while (ref.current.popHandlers.length) {
        const lastHandler = ref.current.popHandlers.shift();
        lastHandler?.();
      }

      update();
    }, [update]);

    const handleClick = useCallback((event: MouseEvent) => {
      const el = (event.target as HTMLElement).closest('a');
      const href = el?.getAttribute('href');

      if (!process.env.PRODUCTION && el) {
        throw new Error(`HistoryStore.handleClick: use <Link> instead of <a> for ${href}`);
      }

      if (href?.startsWith('/')) {
        event.preventDefault();

        _pushPath(href);
      }
    }, [_pushPath]);

    const _addPopHandler = useCallback((popHandler: () => boolean) => {
      ref.current.popHandlers.push(popHandler);
    }, []);

    useEffect(() => {
      window.addEventListener('popstate', handlePopState);
      window.addEventListener('click', handleClick);

      // Capacitor Android.
      const backButtonListener = Capacitor.addListener('backButton', (event: BackButtonListenerEvent) => {
        while (ref.current.popHandlers.length) {
          const lastHandler = ref.current.popHandlers.shift();
          const handled = lastHandler?.();
          if (handled) {
            return;
          }
        }

        if (event.canGoBack) {
          window.history.back();
        } else {
          Capacitor.exitApp();
        }
      });

      return () => {
        window.removeEventListener('popstate', handlePopState);
        window.removeEventListener('click', handleClick);
        void backButtonListener.remove().catch(() => {});
      };
    }, [handlePopState, handleClick, _replacePath, _pushPath]);

    // todo: low/mid scroll to hash in homewrap and stackwrap
    useEffectInitialMount(() => {
      if (ref.current.curState.hash) {
        document.getElementById(ref.current.curState.hash)?.scrollIntoView(true);
      }
    }, [ref.current.curState.hash]);

    // Add home to history.
    // todo: low/mid don't animate slidein after pushing path
    useEffect(() => {
      const { path, query, hash } = ref.current.curState;
      if (!ref.current.didRefresh && path !== '/') {
        batchedUpdates(() => {
          _replacePath('/', null);
          _pushPath(path, query, hash);
        });
      }
    }, [_replacePath, _pushPath]);

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
