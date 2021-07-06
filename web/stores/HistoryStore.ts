import qs from 'query-string';

import useForceUpdate from 'lib/hooks/useForceUpdate';

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

const [
  HistoryProvider,
  useHistoryStore,
  usePushPath,
  useReplacePath,
] = constate(
  function HistoryStore() {
    const ref = useRef(useMemo(() => {
      const initialStateId = window.history.state?.id
        ? Number.parseInt(window.history.state?.id, 10) || 0
        : 0;
      return {
        prevState: null as HistoryState | null,
        curState: getStateFromLocation(initialStateId),
        nextState: null as HistoryState | null,
        direction: 'none' as 'none' | 'back' | 'forward', // none, back, forward
        isReplaced: false,
        nextStateId: initialStateId,
        isInitialState: true,
      };
    }, []));
    const forceUpdate = useForceUpdate();

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

      ref.current.nextStateId++;
      ref.current = markMemoed({
        ...ref.current,
        prevState: ref.current.curState,
        curState: markMemoed({
          path,
          query: markMemoed(query),
          queryStr,
          hash,
          id: ref.current.nextStateId,
        }),
        direction: 'forward',
        isReplaced: false,
        isInitialState: false,
      });

      let fullPath = path;
      if (query) {
        fullPath += `?${queryStr}`;
      }
      if (hash) {
        fullPath += `#${hash}`;
      }
      window.history.pushState(
        { id: ref.current.nextStateId },
        '',
        fullPath,
      );
      forceUpdate();
    }, [forceUpdate]);

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
        { id: ref.current.curState.id },
        '',
        query ? `${path}?${queryStr}` : path,
      );
      forceUpdate();
    }, [forceUpdate]);

    const handlePopState = useCallback((event: PopStateEvent) => {
      const stateId = event.state?.id;
      const poppedStateId = typeof stateId === 'number' ? stateId : 0;
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
      ref.current.nextStateId = Math.max(ref.current.nextStateId, poppedStateId);
      forceUpdate();
    }, [forceUpdate]);

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

    useEffect(() => {
      window.addEventListener('popstate', handlePopState);
      window.addEventListener('click', handleClick);

      // todo: mid/mid store prevUrl in history state to check is prevUrl is in app
      // todo: mid/mid fix logic of adding home to history
      /*
      const { path, query, hash } = ref.current.curState;
      if (!ref.current.prevState?.path && path && path !== '/'
        && nextStateId === 0) {
        batchedUpdates(() => {
          _replacePath('/', null);
          _pushPath(path, query, hash);
        });
      }
      */

      return () => {
        window.removeEventListener('popstate', handlePopState);
        window.removeEventListener('click', handleClick);
      };
    }, [handlePopState, handleClick, _replacePath, _pushPath]);

    useEffect(() => {
      if (ref.current.curState.hash) {
        document.getElementById(ref.current.curState.hash)?.scrollIntoView(true);
      }
    }, [ref.current.curState.hash]);

    return useDeepMemoObj({
      prevState: ref.current.prevState,
      curState: ref.current.curState,
      direction: ref.current.direction,
      isReplaced: ref.current.isReplaced,
      isInitialState: ref.current.isInitialState,
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
