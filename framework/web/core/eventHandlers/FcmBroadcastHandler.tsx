import FcmBroadcastChannel from 'services/FcmBroadcastChannel';
import safeParseJson from 'utils/safeParseJson';
import stringify from 'utils/stringify';
import useHandleApiEntities from 'hooks/api/useHandleApiEntities';
import { FcmNotifData } from 'consts/notifs';

export default function FcmBroadcastHandler() {
  const handleApiEntities = useHandleApiEntities(true);
  const pushPath = usePushPath();

  useEffect(() => {
    const cb = (event: MessageEvent) => {
      if (!event.data || !event.data.apiData || !event.data.path) {
        return;
      }

      const data = event.data as FcmNotifData;
      const apiData = safeParseJson<ApiSuccessResponse<any>>(
        data.apiData,
        val => val && TS.isObj(val) && val.entities,
      );
      if (!apiData || !TS.hasProp(apiData, 'data')) {
        ErrorLogger.warn(new Error(`FcmBroadcastHandler: invalid FCM message: ${stringify(data).slice(0, 200)}`));
        return;
      }

      handleApiEntities(apiData as StableDeep<ApiSuccessResponse<any>>);
      pushPath(data.path);
    };

    FcmBroadcastChannel.addEventListener('message', cb);

    return () => {
      FcmBroadcastChannel.removeEventListener('message', cb);
    };
  }, [handleApiEntities, pushPath]);

  return null;
}
