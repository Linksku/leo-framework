import { PushNotifications } from '@capacitor/push-notifications';

import useRegisterSW from 'core/sw/useRegisterSW';
import detectPlatform from 'utils/detectPlatform';
import { NOTIF_CHANNELS, NOTIF_CHANNEL_CONFIGS } from 'config/notifs';
import useLastRegistrationTokenStorage from 'core/storage/useLastRegistrationTokenStorage';
import useEffectOncePerDeps from 'utils/useEffectOncePerDeps';
import retryImport from 'utils/retryImport';
import getDeviceId from 'utils/getDeviceId';

async function androidSyncChannels() {
  const channels = await PushNotifications.listChannels();
  const channelsToDelete = channels.channels
    .filter(channel => !TS.includes(Object.values(NOTIF_CHANNELS), channel.id));
  if (channelsToDelete.length) {
    await Promise.all(channelsToDelete.map(
      channel => PushNotifications.deleteChannel({ id: channel.id }),
    ));
  }

  await Promise.all(Object.values(NOTIF_CHANNELS).map(
    channel => PushNotifications.createChannel({
      id: channel,
      name: NOTIF_CHANNEL_CONFIGS[channel].name,
    }),
  ));
}

const didRegisterTokenAtom = atom(false);

let registerTokenLocked = false;

// If permission's already granted, update token automatically and return null
// Else, return function to request permission and update token
export default function useRegisterPushNotifs(): Stable<() => Promise<boolean>> | null {
  const registerSW = useRegisterSW();
  const platform = detectPlatform();
  const [grantedPermissions, setGrantedPermissions] = useState<boolean | null>(
    !platform.isNative && window.Notification
      ? window.Notification.permission === 'granted'
      : null,
  );
  const [registeredToken, setRegisteredToken] = useLastRegistrationTokenStorage();
  const [didRegisterToken, setDidRegisterToken] = useAtom(didRegisterTokenAtom);
  const authState = useAuthState();

  const { fetchApi } = useDeferredApi(
    'registerPushNotifToken',
    useMemo(() => ({
      platform: platform.type,
    }), [platform.type]),
    {
      type: 'create',
      shouldFetch: authState !== 'out',
      onFetch(_, { registrationToken }) {
        EventLogger.track('Register Push Notifs');

        setRegisteredToken(registrationToken);
      },
    },
  );

  const registerPushNotifs = useCallback(async (hasPermission?: boolean) => {
    registerTokenLocked = true;

    let registrationToken: string | null = null;
    try {
      if (platform.isNative) {
        if (!hasPermission) {
          const result = await PushNotifications.requestPermissions();
          if (result.receive !== 'granted') {
            return false;
          }
        }

        registrationToken = await new Promise((succ, fail) => {
          PushNotifications.addListener('registration', token => {
            succ(token.value);

            if (platform.os === 'android') {
              androidSyncChannels()
                .catch(err => ErrorLogger.warn(err, { ctx: 'androidSyncChannelss' }));
            }
          })
            .catch(fail);

          PushNotifications.addListener('registrationError', err => {
            fail(err);
          })
            .catch(fail);

          PushNotifications.register()
            .catch(fail);
        });
      } else if (!registerSW) {
        return false;
      } else {
        const { module: registerSwPushNotifs, registration } = await promiseObj({
          module: retryImport(() => import(
            /* webpackChunkName: 'registerSwPushNotifs' */ 'features/notifs/registerSwPushNotifs'
          )),
          registration: registerSW(),
        });
        if (!registration) {
          return false;
        }
        registrationToken = await registerSwPushNotifs.default(registration);
      }
    } catch (err) {
      ErrorLogger.warn(
        err instanceof Error ? err : new Error('Failed to register push notifs'),
      );
      return false;
    }

    if (registrationToken) {
      setDidRegisterToken(true);
      if (registrationToken !== registeredToken) {
        const deviceId = await getDeviceId();
        fetchApi({
          deviceId,
          registrationToken,
        });
      }
      return true;
    }
    return false;
  }, [platform, registerSW, registeredToken, setDidRegisterToken, fetchApi]);

  // todo: low/easy check incognito for register push notifs
  const supportsNotifs = platform.isNative
    || !!(registerSW
      && window.Notification
      && navigator.permissions);
  useEffectOncePerDeps(() => {
    if (authState === 'out' || didRegisterToken || !supportsNotifs) {
      return;
    }
    if (platform.isNative) {
      PushNotifications.checkPermissions()
        .then(result => {
          setGrantedPermissions(result.receive === 'granted');
          return result.receive === 'granted' && !registerTokenLocked
            ? registerPushNotifs(true)
            : undefined;
        })
        .catch(err => {
          ErrorLogger.warn(err, { ctx: 'PushNotifications.checkPermissions' });
        });
    } else if (grantedPermissions && !registerTokenLocked) {
      registerPushNotifs(true)
        .catch(err => {
          ErrorLogger.warn(err, { ctx: 'registerPushNotifs' });
        });
    }
  }, [authState, supportsNotifs]);

  if (authState === 'out'
    || didRegisterToken
    || !supportsNotifs
    || grantedPermissions !== false) {
    return null;
  }
  return supportsNotifs
    ? registerPushNotifs
    : null;
}
