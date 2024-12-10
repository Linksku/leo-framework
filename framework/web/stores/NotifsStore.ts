export const [
  NotifsProvider,
  useNotifsStore,
  useUnseenNotifIds,
] = constate(
  function NotifsStore() {
    const [unseenNotifIds, setUnseenNotifIds] = useState(
      EMPTY_OBJ as Partial<Record<NotifScope, Set<INotif['id']>>>,
    );

    const { fetchApi: updateSeenNotifs } = useDeferredApi(
      'seenNotifs',
      EMPTY_OBJ,
      {
        type: 'update',
      },
    );

    const seenNotifs = useCallback((...scopes: NotifScope[]) => {
      if (scopes.every(scope => !unseenNotifIds[scope]?.size)) {
        return;
      }

      updateSeenNotifs({
        scopes,
      });

      setUnseenNotifIds(s => {
        const newState = { ...s };
        for (const scope of scopes) {
          delete newState[scope];
        }
        return newState;
      });
    }, [unseenNotifIds, updateSeenNotifs]);

    return useMemo(() => ({
      unseenNotifIds,
      setUnseenNotifIds,
      seenNotifs,
    }), [unseenNotifIds, setUnseenNotifIds, seenNotifs]);
  },
  function NotifsStore(val) {
    return val;
  },
  function UnseenNotifIds(val) {
    return val.unseenNotifIds;
  },
);
