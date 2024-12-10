import { atomFamily } from 'jotai/utils';

import useVisibilityObserver from 'utils/useVisibilityObserver';
import { useRouteContainerRef } from 'stores/RouteStore';
import useFtueSeenTimeStorage from './useFtueSeenTimeStorage';

const ALWAYS_SHOW: false = !process.env.PRODUCTION
  // For debugging
  && false;

const seenTimeFamily = atomFamily(
  ({ defaultVal }: { type: string, defaultVal: number }) => atom(defaultVal),
  (a, b) => a.type === b.type,
);

export default function useSeenFtue(
  type: string,
  {
    onVisible,
  }: {
    onVisible?: Stable<() => void>;
  } = {},
) {
  const currentUserId = useCurrentUserId();
  const [markedSeen, setMarkedSeen] = useState(false);
  const [seenTimeStorageRaw, setSeenTimeStorage] = useFtueSeenTimeStorage(type);
  const seenTimeStorage = ALWAYS_SHOW ? 0 : seenTimeStorageRaw;
  const routeContainerRef = useRouteContainerRef(true);

  const seenTimeAtom = seenTimeFamily({ type, defaultVal: seenTimeStorage });
  const [seenTimeGlobal, setSeenTimeGlobal] = useAtom(seenTimeAtom);

  useApi(
    'ftueSeenTime',
    useMemo(() => ({
      ftueTypes: [type],
    }), [type]),
    {
      shouldFetch: !!currentUserId && !seenTimeStorage && !ALWAYS_SHOW,
      onFetch() {
        if (seenTimeStorage > seenTimeGlobal) {
          setSeenTimeGlobal(seenTimeStorage);
        }
      },
    },
  );

  const { fetchApi } = useDeferredApi(
    'seenFtue',
    useMemo(() => ({
      ftueType: type,
    }), [type]),
    {
      type: 'create',
    },
  );

  const markSeen = useCallback(() => {
    if (markedSeen) {
      return;
    }

    if (currentUserId) {
      fetchApi({});
    }
    setMarkedSeen(true);
    setSeenTimeStorage(Date.now());
    onVisible?.();
  }, [
    markedSeen,
    currentUserId,
    fetchApi,
    setSeenTimeStorage,
    onVisible,
  ]);

  const dismiss = useCallback(() => {
    markSeen();
    setSeenTimeGlobal(Math.max(seenTimeStorage, Date.now()));

    EventLogger.track(`Dismiss ${type}`);
  }, [markSeen, setSeenTimeGlobal, seenTimeStorage, type]);

  const visibilityRef = useVisibilityObserver({
    onVisible: markSeen,
    getRoot: useCallback(
      () => markStable(routeContainerRef?.current?.parentElement),
      [routeContainerRef],
    ),
  });

  return useMemo(() => ({
    lastSeenTime: seenTimeGlobal,
    ref: visibilityRef,
    dismiss,
  }), [seenTimeGlobal, visibilityRef, dismiss]);
}
