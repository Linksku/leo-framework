import useHandleEntityEvents from 'utils/hooks/entities/useHandleEntityEvents';
import useUpdate from 'utils/hooks/useUpdate';

export const [
  NotifsProvider,
  useNotifsStore,
] = constate(
  function NotifsStore() {
    const authState = useAuthState();
    const currentUserId = useCurrentUserId();
    const unseenNotifIds = useRef<Memoed<ObjectOf<Set<INotif['id']>>>>(EMPTY_OBJ);
    const update = useUpdate();

    useApi(
      'unseenNotifIds',
      EMPTY_OBJ,
      {
        shouldFetch: authState !== 'out',
        onFetch({ notifIds }) {
          const newState = { ...unseenNotifIds.current };
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

          if (hasChanged) {
            unseenNotifIds.current = markMemoed(newState);
            update();
          }
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
        if (!unseenNotifIds.current[notif.notifType]?.has(notif.id)) {
          const set = unseenNotifIds.current[notif.notifType] ?? new Set();
          set.add(notif.id);
          unseenNotifIds.current[notif.notifType] = set;
          update();
        }
      }, [update]),
    );

    const seenNotifs = useCallback(() => {
      const numUnseenNotifs = Object.keys(unseenNotifIds.current).length;
      if (!numUnseenNotifs
        || (numUnseenNotifs === 1 && unseenNotifIds.current.chatReplyCreated?.size)) {
        updateSeenNotifs({
          notifType: 'notifs',
        });

        unseenNotifIds.current = unseenNotifIds.current.chatReplyCreated?.size
          ? markMemoed({
            chatReplyCreated: unseenNotifIds.current.chatReplyCreated,
          } as ObjectOf<Set<INotif['id']>>)
          : EMPTY_OBJ;
        update();
      }
    }, [updateSeenNotifs, update]);

    const seenChats = useCallback(() => {
      if (unseenNotifIds.current.chatReplyCreated?.size) {
        updateSeenNotifs({
          notifType: 'chats',
        });

        delete unseenNotifIds.current.chatReplyCreated;
        update();
      }
    }, [updateSeenNotifs, update]);

    return useMemo(() => ({
      unseenNotifIds: unseenNotifIds.current,
      seenNotifs,
      seenChats,
    }), [unseenNotifIds, seenNotifs, seenChats]);
  },
);
