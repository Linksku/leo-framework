import getFcmBroadcastChannel from 'services/getFcmBroadcastChannel';
import safeParseJson from 'utils/safeParseJson';
import stringify from 'utils/stringify';
import useHandleApiEntities from 'stores/api/useHandleApiEntities';
import { FcmNotifData } from 'consts/notifs';

export default function FcmBroadcastHandler() {
  const handleApiEntities = useHandleApiEntities(true);
  const pushPath = usePushPath();
  const authState = useAuthState();

  useEffect(() => {
    if (authState === 'out') {
      return NOOP;
    }

    const cb = (event: MessageEvent) => {
      if (!TS.isObj(event.data) || !event.data.apiData || !event.data.path) {
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

    getFcmBroadcastChannel().addEventListener('message', cb);

    return () => {
      getFcmBroadcastChannel().removeEventListener('message', cb);
    };
  }, [authState, handleApiEntities, pushPath]);

  return null;
}
