import { useNotifsStore } from 'stores/NotifsStore';
import useHandleEntityEvents from 'stores/entities/useHandleEntityEvents';

export default function NotifsHandlers() {
  const authState = useAuthState();
  const currentUserId = useCurrentUserId();
  const { setUnseenNotifIds } = useNotifsStore();

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

  useSse(
    'notifCreated',
    { userId: currentUserId },
    { isEnabled: !!currentUserId },
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
    }, [setUnseenNotifIds]),
  );

  return null;
}
