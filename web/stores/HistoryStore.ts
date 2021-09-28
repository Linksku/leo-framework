import type { BackButtonListenerEvent } from '@capacitor/app';
import qs from 'query-string';
import { App as Capacitor } from '@capacitor/app';
import useUpdate from 'lib/hooks/useUpdate';

// Reduce rerenders.
const QS_CACHE: ObjectOf<Memoed<ObjectOf<string | string[] | null>>> = Object.create(null);
function getStateFromLocation(stateId: number): HistoryState {
  const { pathname, search, hash } = window.location;
  let pathDecoded: string;
  try {
    pathDecoded = decodeURIComponent(pathname);
  } catch {
    pathDecoded = pathname;
  }

  if (search) {
    QS_CACHE[search] = markMemoed(qs.parse(search));
  }
  return markMemoed({
    path: pathDecoded,
    query: QS_CACHE[search] ?? EMPTY_OBJ,
    queryStr: search || null,
    hash: hash ? hash.slice(1) : null,
    id: stateId,
  });
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

function queryStrVals(query: ObjectOf<string | string[] | number | number[] | null>) {
  const newQuery: ObjectOf<string | string[] | null> = {};
  for (const [k, v] of TS.objectEntries(query)) {
    if (Array.isArray(v)) {
      newQuery[k] = v.map((v2: number | string) => (typeof v2 === 'number' ? `${v2}` : v2));
    } else if (typeof v === 'number') {
      newQuery[k] = `${v}`;
    } else {
      newQuery[k] = v;
    }
  }
  return newQuery;
}

const [
  HistoryProvider,
  useHistoryStore,
  usePushPath,
  useReplacePath,
] = constate(
  function HistoryStore() {
    const ref = useRef(useConst(() => {
      const initialStateId = TS.parseIntOrNull(window.history.state?.id) ?? 0;
      return {
        prevState: null as HistoryState | null,
        curState: getStateFromLocation(initialStateId),
        direction: 'none' as 'none' | 'back' | 'forward',
        isReplaced: false,
        isInitialState: true,
        hadExistingHistoryState: !!window.history?.state,
        popHandlers: [] as (() => boolean)[],
      };
    }));
    const update = useUpdate();

    const _pushPath = useCallback((
      _path: string,
      _query: ObjectOf<string | string[] | number | number[] | null> | null = null,
      _hash: string | null = null,
    ) => {
      const firstQuestion = _path.indexOf('?');
      const firstHash = _path.indexOf('#');
      const path = _path.replace(/[#?].*$/, '');

      if (process.env.NODE_ENV !== 'production' && (
        (_query && firstQuestion >= 0)
        || (_hash && firstHash >= 0)
      )) {
        throw new Error(`pushPath(${_path}): don't include query/hash in path`);
      }

      let query: ObjectOf<string | string[] | null> | null = null;
      let queryStr: string | null = null;
      if (_query) {
        query = queryStrVals(_query);
        queryStr = qs.stringify(query);
      } else if (firstQuestion >= 0) {
        if (firstHash < 0) {
          queryStr = _path.slice(firstQuestion + 1);
          query = qs.parse(queryStr);
        } else if (firstQuestion < firstHash) {
          queryStr = _path.slice(firstQuestion + 1, firstHash);
          query = qs.parse(queryStr);
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
        isInitialState: false,
      });

      window.history.pushState(
        {
          id: ref.current.curState.id,
        },
        '',
        getFullPath(path, queryStr, hash),
      );
      update();
    }, [update]);

    const _replacePath = useCallback((
      path: string,
      query: ObjectOf<string | string[] | number | number[] | null> | null = null,
      hash: string | null = null,
    ) => {
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
          query: query ? markMemoed(queryStrVals(query)) : EMPTY_OBJ,
          queryStr,
          hash,
          id: ref.current.curState.id,
        }),
        isReplaced: true,
        isInitialState: false,
      });
      window.history.replaceState(
        {
          id: ref.current.curState.id,
        },
        '',
        getFullPath(path, queryStr, hash),
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
          : getStateFromLocation(poppedStateId),
        direction: poppedStateId >= ref.current.curState.id ? 'forward' : 'back',
        isReplaced: false,
        isInitialState: false,
      });

      // Can't cancel pop event, so clear all pop handlers.
      while (ref.current.popHandlers.length) {
        const lastHandler = ref.current.popHandlers.shift();
        lastHandler?.();
      }

      update();
    }, [update]);

    const handleClick = useCallback(event => {
      const el = event.target.closest('a');
      const href = el?.getAttribute('href');

      if (process.env.NODE_ENV !== 'production' && el) {
        throw new Error(`HistoryStore.handleClick: use <Link> instead of <a> for ${href}`);
      }

      if (href?.startsWith('/')) {
        event.preventDefault();

        _pushPath(href);
      }
    }, [_pushPath]);

    const addPopHandler = useCallback((popHandler: () => boolean) => {
      ref.current.popHandlers.push(popHandler);
    }, []);

    useEffect(() => {
      window.addEventListener('popstate', handlePopState);
      window.addEventListener('click', handleClick);

      // Capacitor Android.
      void Capacitor.addListener('backButton', (event: BackButtonListenerEvent) => {
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
      };
    }, [handlePopState, handleClick, _replacePath, _pushPath]);

    // todo: low/mid scroll to hash in homewrap and stackwrap
    useEffect(() => {
      if (ref.current.curState.hash) {
        document.getElementById(ref.current.curState.hash)?.scrollIntoView(true);
      }
    }, [ref.current.curState.hash]);

    // Add home to history.
    // todo: low/mid don't animate slidein after pushing path
    useEffect(() => {
      const { path, query, hash } = ref.current.curState;
      if (!ref.current.hadExistingHistoryState && path !== '/') {
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
      isInitialState: ref.current.isInitialState,
      addPopHandler,
      _pushPath,
      _replacePath,
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
);

export { HistoryProvider, useHistoryStore, usePushPath, useReplacePath };
