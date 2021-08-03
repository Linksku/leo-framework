import type { BackButtonListenerEvent } from '@capacitor/app';
import qs from 'query-string';
import { App as Capacitor } from '@capacitor/app';
import useUpdate from 'react-use/lib/useUpdate';

// Reduce rerenders.
const QS_CACHE: ObjectOf<Memoed<ObjectOf<any>>> = Object.create(null);
function getStateFromLocation(stateId: number): HistoryState {
  const { pathname, search, hash } = window.location;
  let pathDecoded;
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
    query: QS_CACHE[search] ?? null,
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

const [
  HistoryProvider,
  useHistoryStore,
  usePushPath,
  useReplacePath,
] = constate(
  function HistoryStore() {
    const ref = useRef(useMemo(() => {
      const initialStateId = window.history.state?.id
        ? Number.parseInt(window.history.state.id, 10) || 0
        : 0;
      return {
        prevState: null as HistoryState | null,
        curState: getStateFromLocation(initialStateId),
        direction: 'none' as 'none' | 'back' | 'forward',
        isReplaced: false,
        isInitialState: true,
        hadExistingHistoryState: !!window.history?.state,
        popHandlers: [] as (() => boolean)[],
      };
    }, []));
    const update = useUpdate();

    const _pushPath = useCallback((
      path: string,
      query: ObjectOf<any> | null = null,
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
        prevState: ref.current.curState,
        curState: markMemoed({
          path,
          query: markMemoed(query),
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
      query: ObjectOf<any> | null = null,
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
          query: markMemoed(query),
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
      if (href?.startsWith('/')) {
        event.preventDefault();

        const firstQuestion = href.indexOf('?');
        const firstHash = href.indexOf('#');
        const path = href.replace(/[#?].*$/, '');
        const hash = firstHash >= 0 ? href.slice(firstHash + 1) : '';
        let params: ObjectOf<any> | null = null;
        if (firstQuestion >= 0) {
          if (firstHash < 0) {
            params = qs.parse(href.slice(firstQuestion + 1));
          } else if (firstQuestion < firstHash) {
            params = qs.parse(href.slice(firstQuestion + 1, firstHash));
          }
        }
        _pushPath(
          path,
          params,
          hash,
        );
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
    useEffect(() => {
      const { path, query, hash } = ref.current.curState;
      if (!ref.current.hadExistingHistoryState && path !== '/') {
        batchedUpdates(() => {
          _replacePath('/', null);
          _pushPath(path, query, hash);
        });
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

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
