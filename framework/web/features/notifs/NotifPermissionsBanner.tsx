import useRegisterPushNotifs from 'features/notifs/useRegisterPushNotifs';
import detectPlatform from 'utils/detectPlatform';
import { APP_NAME } from 'config';
import useSeenFtue from 'core/ftue/useSeenFtue';
import ModalInner from 'core/frame/ModalInner';

import styles from './NotifPermissionsBanner.scss';

export default React.memo(function NotifPermissionsBanner({
  className,
  shownOdds = 0.25,
}: {
  className?: string,
  shownOdds?: number,
}) {
  const registerPushNotifs = useRegisterPushNotifs();
  const seenFtue = useSeenFtue('notifPermissionsBanner');
  const [shown, setShown] = useState(
    Date.now() - seenFtue.lastSeenTime > 24 * 60 * 60 * 1000
    && Math.random() < shownOdds,
  );
  const [enabling, setEnabling] = useState(false);
  const platform = detectPlatform();

  useEffect(() => {
    if (!shown) {
      return undefined;
    }

    let permissionStatus: PermissionStatus | null = null;
    const handleChange = () => {
      setShown(!!permissionStatus && permissionStatus.state !== 'granted');
    };

    navigator.permissions
      ?.query({ name: 'notifications' })
      .then(_permissionStatus => {
        permissionStatus = _permissionStatus;
        permissionStatus.addEventListener('change', handleChange);
      })
      .catch(() => {
        setShown(false);
      });

    return () => {
      permissionStatus?.removeEventListener('change', handleChange);
    };
  }, [shown]);

  if (!shown || !registerPushNotifs) {
    return null;
  }
  return (
    <div className={cx(styles.container, className)}>
      <div
        ref={seenFtue.ref}
        className={styles.banner}
      >
        <Button
          label="Enable push notifications"
          onClick={async () => {
            setEnabling(true);
            const succeeded = await registerPushNotifs();
            if (succeeded) {
              setShown(false);
              seenFtue.dismiss();
            } else {
              showModal({
                title: 'Failed to enable notifications',
                elem: (
                  <ModalInner
                    title="'Failed to enable notifications'"
                    okText="Close"
                  >
                    <p>You may need to enable notifications in your browser or system settings.</p>
                    {platform.os === 'android' && (
                      <p>{`Go to Settings > Apps > ${APP_NAME} > Notifications to enable notifications.`}</p>
                    )}
                    {platform.os === 'ios' && (
                      <p>{`Go to Settings > Notifications > ${APP_NAME} to enable notifications.`}</p>
                    )}
                  </ModalInner>
                ),
              });
            }
            setEnabling(false);
          }}
          small
          fullWidth
          fetching={enabling}
        />
        <Link
          onClick={() => {
            setShown(false);
            seenFtue.dismiss();
          }}
          blue
          disabled={enabling}
          className={styles.maybeLater}
        >
          Maybe later
        </Link>
      </div>
    </div>
  );
});
