import useTimeAgo from 'utils/hooks/useTimeAgo';

import styles from './NotifItemStyles.scss';

type Props = {
  itemId: EntityId,
};

function NotifItem({ itemId }: Props) {
  const notif = useEntity('notif', itemId);
  const pushPath = usePushPath();
  const timeAgo = useTimeAgo(notif?.time.getTime());
  const mutateEntity = useMutateEntity();

  const { fetchApi: readNotif } = useDeferredApi(
    'readNotif',
    {
      notifId: itemId as Notif['id'],
    },
    {
      type: 'update',
      showToastOnError: false,
    },
  );

  const { content, path } = notif?.extras ?? {};
  if (!content || !path || !notif) {
    return null;
  }
  return (
    <div
      onClick={() => {
        mutateEntity('notif', itemId, {
          action: 'update',
          partial: {
            hasRead: true,
          },
        });
        readNotif({});
        pushPath(path);
      }}
      role="button"
      tabIndex={-1}
      className={cn(styles.item, {
        [styles.unread]: !notif.hasRead,
      })}
    >
      <div className={styles.leftWrap}>
        {notif?.extras?.content}
        <div className={styles.time}>
          {timeAgo}
        </div>
      </div>
      <div className={styles.rightWrap}>
        {notif.hasRead
          ? null
          : (
            <div className={styles.unreadIndicator} />
          )}
      </div>
    </div>
  );
}

export default React.memo(NotifItem);
