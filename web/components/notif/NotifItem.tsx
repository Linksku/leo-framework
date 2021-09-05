import useTimeAgo from 'lib/hooks/useTimeAgo';

import styles from './NotifItemStyles.scss';

type Props = {
  itemId: number,
};

function NotifItem({ itemId }: Props) {
  const notif = useEntity('notif', itemId);
  const pushPath = usePushPath();
  const timeAgo = useTimeAgo(notif?.time);
  const { updateEntity } = useEntitiesStore();

  const { fetchApi: readNotif } = useDeferredApi(
    'readNotif',
    {
      notifId: itemId,
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
        updateEntity('notif', itemId, {
          hasRead: true,
        });
        void readNotif();
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
