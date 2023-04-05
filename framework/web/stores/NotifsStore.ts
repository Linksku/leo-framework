import useHandleEntityEvents from 'hooks/entities/useHandleEntityEvents';

export const [
  NotifsProvider,
  useNotifsStore,
] = constate(
  function NotifsStore() {
    const authState = useAuthState();
    const currentUserId = useCurrentUserId();
    const [unseenNotifIds, setUnseenNotifIds] = useState<ObjectOf<Set<INotif['id']>>>(EMPTY_OBJ);

    useApi(
      'unseenNotifIds',
      EMPTY_OBJ,
      {
        shouldFetch: authState !== 'out',
        onFetch({ notifIds }) {
          setUnseenNotifIds(s => {
            const newState = { ...s };
            let hasChanged = false;
            for (const [notifType, idsArr] of TS.objEntries(notifIds)) {
              const newSet = new Set(newState[notifType] ?? []);
              for (const id of idsArr) {
                newSet.add(id);
              }
              if (newSet.size !== (newState[notifType]?.size ?? 0)) {
                hasChanged = true;
                newState[notifType] = newSet;
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
          if (s[notif.notifType]?.has(notif.id)) {
            return s;
          }

          const newSet = s[notif.notifType] ?? new Set();
          newSet.add(notif.id);
          return {
            ...s,
            [notif.notifType]: newSet,
          };
        });
      }, []),
    );

    const seenNotifs = useCallback(() => {
      setUnseenNotifIds(s => {
        const numUnseenNotifs = Object.keys(s).length;
        if (!numUnseenNotifs || (numUnseenNotifs === 1 && s.chatReplyCreated)) {
          return s;
        }

        updateSeenNotifs({
          notifType: 'notifs',
        });

        return s.chatReplyCreated?.size
          ? {
            chatReplyCreated: s.chatReplyCreated,
          }
          : EMPTY_OBJ;
      });
    }, [updateSeenNotifs]);

    const seenChats = useCallback(() => {
      setUnseenNotifIds(s => {
        if (!s.chatReplyCreated?.size) {
          return s;
        }

        updateSeenNotifs({
          notifType: 'chats',
        });

        const { chatReplyCreated, ...notifs } = s;
        return notifs;
      });
    }, [updateSeenNotifs]);

    return useMemo(() => ({
      unseenNotifIds,
      seenNotifs,
      seenChats,
    }), [unseenNotifIds, seenNotifs, seenChats]);
  },
);
