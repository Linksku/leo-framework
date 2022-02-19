import omitSingle from 'lib/omitSingle';

export const [
  NotifsProvider,
  useNotifsStore,
] = constate(
  function NotifsStore() {
    const authState = useAuthState();
    const currentUserId = useCurrentUserId();
    const { addEntityListener } = useEntitiesStore();
    const [unseenNotifIds, setUnseenNotifIds] = useState<ObjectOf<Set<Notif['id']>>>({});

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
        isReady: !!currentUserId,
      },
    );

    useEffect(() => {
      const offCreate = addEntityListener('create', 'notif', notif => {
        setUnseenNotifIds(s => {
          const set = s[notif.notifType] ?? new Set();
          set.add(notif.id);
          return { ...s, [notif.notifType]: set };
        });
      });

      return () => {
        offCreate();
      };
    }, [addEntityListener]);

    const seenNotifs = useCallback(() => {
      void updateSeenNotifs({
        notifType: 'notifs',
      });
      setUnseenNotifIds(s => (s.chatReplyCreated
        ? { chatReplyCreated: s.chatReplyCreated }
        : {}));
    }, [updateSeenNotifs]);

    const seenChats = useCallback(() => {
      void updateSeenNotifs({
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