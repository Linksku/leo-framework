import { PushNotifications } from '@capacitor/push-notifications';

import type { FcmNotifData } from 'consts/notifs';
import safeParseJson from 'utils/safeParseJson';
import stringify from 'utils/stringify';
import useHandleApiEntities from 'stores/api/useHandleApiEntities';

export default function NativePushNotifHandler() {
  const handleApiEntities = useHandleApiEntities(true);
  const pushPath = usePushPath();

  useEffect(() => {
    PushNotifications.addListener('pushNotificationReceived', notif => {
      const data = notif.data as Nullish<Partial<FcmNotifData>>;
      if (!data?.apiData) {
        ErrorLogger.warn(new Error(`NativePushNotifHandler: invalid message: ${stringify(notif.data).slice(0, 200)}`));
        return;
      }

      const apiData = safeParseJson<ApiSuccessResponse<any>>(
        data.apiData,
        val => val && TS.isObj(val) && val.entities,
      );
      handleApiEntities(apiData as StableDeep<ApiSuccessResponse<any>>);
    })
      .catch(err => {
        ErrorLogger.warn(err, { ctx: 'NativePushNotifHandler.pushNotificationReceived' });
      });

    PushNotifications.addListener('pushNotificationActionPerformed', action => {
      const data = action.notification.data as Nullish<Partial<FcmNotifData>>;
      if (data?.path) {
        pushPath(data.path);
      }
    })
      .catch(err => {
        ErrorLogger.warn(err, { ctx: 'NativePushNotifHandler.pushNotificationActionPerformed' });
      });

    return () => {
      PushNotifications.removeAllListeners()
        .catch(err => {
          ErrorLogger.warn(err, { ctx: 'NativePushNotifHandler.removeAllListeners' });
        });
    };
  }, [handleApiEntities, pushPath]);

  return null;
}
