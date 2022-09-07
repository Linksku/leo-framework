import omitSingle from 'utils/omitSingle';
import useHandleEntityEvent from 'utils/hooks/entities/useHandleEntityEvent';

export const [
  NotifsProvider,
  useNotifsStore,
] = constate(
  function NotifsStore() {
    const authState = useAuthState();
    const currentUserId = useCurrentUserId();
    const [unseenNotifIds, setUnseenNotifIds] = useState<ObjectOf<Set<INotif['id']>>>({});

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
              if (newSet.size !== newState[notifType]?.size) {
                hasChanged = true;
                newState[notifType] = newSet;
              }
            }
            return hasChanged ? newState : s;
          });
        },
      },
    );

    const { fetchApi: updateSeenNotifs } = useDeferredApi('seenNotifs', {}, {
      type: 'update',
      noReturnState: true,
      showToastOnError: false,
    });

    useSse(
      'notifCreated',
      { userId: currentUserId },
      {
        isReady: !!currentUserId && authState !== 'out',
      },
    );

    useHandleEntityEvent('create', 'notif', useCallback(notif => {
      setUnseenNotifIds(s => {
        const set = s[notif.notifType] ?? new Set();
        set.add(notif.id);
        return { ...s, [notif.notifType]: set };
      });
    }, []));

    const seenNotifs = useCallback(() => {
      updateSeenNotifs({
        notifType: 'notifs',
      });
      setUnseenNotifIds(s => (s.chatReplyCreated
        ? { chatReplyCreated: s.chatReplyCreated }
        : {}));
    }, [updateSeenNotifs]);

    const seenChats = useCallback(() => {
      updateSeenNotifs({
        notifType: 'chats',
      });
      setUnseenNotifIds(s => (s.chatReplyCreated
        ? omitSingle('chatReplyCreated', s)
        : s));
    }, [updateSeenNotifs]);

    return useDeepMemoObj({
      unseenNotifIds,
      seenNotifs,
      seenChats,
    });
  },
);
