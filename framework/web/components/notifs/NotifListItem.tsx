import dayjs from 'dayjs';

import getTimeAgo from 'utils/getTimeAgo';

import styles from './NotifListItemStyles.scss';

type Props = {
  item: EntityId,
};

export default React.memo(function NotifListItem({ item }: Props) {
  const notif = useEntity('notif', item);
  const pushPath = usePushPath();
  const mutateEntity = useMutateEntity();

  const { fetchApi: readNotif } = useDeferredApi(
    'readNotif',
    useMemo(() => ({
      notifId: item as Notif['id'],
    }), [item]),
    {
      type: 'update',
      showToastOnError: false,
    },
  );

  const { content, path } = notif?.extras ?? {};
  if (!content || !path || !notif) {
    return null;
  }
  // todo: mid/mid post thumb, user pic, etc in notifs
  return (
    <div
      onClick={() => {
        mutateEntity('notif', item, {
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
      className={cx(styles.item, {
        [styles.unread]: !notif.hasRead,
      })}
    >
      <div className={styles.leftWrap}>
        {notif?.extras?.content}
        <div className={styles.time}>
          {(() => {
            if (Date.now() - notif.time.getTime() < 7 * 24 * 60 * 60 * 1000) {
              return getTimeAgo(notif.time.getTime());
            }
            if (notif.time.getFullYear() === (new Date()).getFullYear()) {
              return dayjs(notif.time).format('MMM D');
            }
            return dayjs(notif.time).format('MMM D, YYYY');
          })()}
        </div>
      </div>
      <div className={styles.rightWrap}>
        {!notif.hasRead && <div className={styles.unreadIndicator} />}
      </div>
    </div>
  );
});
