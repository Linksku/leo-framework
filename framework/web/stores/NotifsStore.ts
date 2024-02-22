import useHandleEntityEvents from 'hooks/entities/useHandleEntityEvents';

export const [
  NotifsProvider,
  useNotifsStore,
  useUnseenNotifIds,
] = constate(
  function NotifsStore() {
    const authState = useAuthState();
    const currentUserId = useCurrentUserId();
    const [unseenNotifIds, setUnseenNotifIds] = useState(
      EMPTY_OBJ as Partial<Record<NotifScope, Set<INotif['id']>>>,
    );

    useApi(
      'unseenNotifIds',
      EMPTY_OBJ,
      {
        shouldFetch: authState === 'in',
        onFetch({ notifIds }) {
          setUnseenNotifIds(s => {
            const newState = { ...s };
            let hasChanged = false;
            for (const [scope, idsArr] of TS.objEntries(notifIds)) {
              const newSet = new Set(newState[scope] ?? []);
              for (const id of idsArr) {
                newSet.add(id);
              }
              if (newSet.size !== (newState[scope]?.size ?? 0)) {
                hasChanged = true;
                newState[scope] = newSet;
              }
            }
            return hasChanged ? newState : s;
          });
        },
      },
    );

    const { fetchApi: updateSeenNotifs } = useDeferredApi(
      'seenNotifs',
      EMPTY_OBJ,
      {
        type: 'update',
      },
    );

    useSse(
      'notifCreated',
      { userId: currentUserId },
      { isReady: !!currentUserId },
    );

    useHandleEntityEvents(
      useConst([
        { actionType: 'create', entityType: 'notif' },
        { actionType: 'update', entityType: 'notif' },
      ]),
      useCallback(notif => {
        setUnseenNotifIds(s => {
          if (s[notif.scope]?.has(notif.id)) {
            return s;
          }

          const newSet = s[notif.scope] ?? new Set();
          newSet.add(notif.id);
          return {
            ...s,
            [notif.scope]: newSet,
          };
        });
      }, []),
    );

    const seenNotifs = useCallback((scope: NotifScope) => {
      if (unseenNotifIds[scope]?.size) {
        updateSeenNotifs({
          scope,
        });
      }

      setUnseenNotifIds(s => {
        if (!s[scope]?.size) {
          return s;
        }

        const { [scope]: _, ...notifs } = s;
        return notifs;
      });
    }, [unseenNotifIds, updateSeenNotifs]);

    return useMemo(() => ({
      unseenNotifIds,
      seenNotifs,
    }), [unseenNotifIds, seenNotifs]);
  },
  function NotifsStore(val) {
    return val;
  },
  function UnseenNotifIds(val) {
    return val.unseenNotifIds;
  },
);
