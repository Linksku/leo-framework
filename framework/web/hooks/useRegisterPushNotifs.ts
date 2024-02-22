import { Device } from '@capacitor/device';
import { PushNotifications } from '@capacitor/push-notifications';

import useRegisterSW from 'hooks/useRegisterSW';
import detectPlatform from 'utils/detectPlatform';
import { NOTIF_CHANNELS, NOTIF_CHANNEL_NAMES } from 'config/notifs';
import useEffectOncePerDeps from './useEffectOncePerDeps';

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
      name: NOTIF_CHANNEL_NAMES[channel],
    }),
  ));
}

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
  const [registeredToken, setRegisteredToken] = useGlobalState<string | null>(
    'useRegisterPushNotifs',
    null,
  );
  const authState = useAuthState();

  const { fetchApi } = useDeferredApi(
    'registerPushNotifToken',
    useMemo(() => ({
      platform: platform.type,
    }), [platform.type]),
    {
      shouldFetch: authState !== 'out',
      onFetch(_, { registrationToken }) {
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
          module: import('services/registerSwPushNotifs'),
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

    if (registrationToken && registrationToken !== registeredToken) {
      const deviceId = await Device.getId();
      fetchApi({
        deviceId: deviceId.identifier,
        registrationToken,
      });
      return true;
    }
    return false;
  }, [platform, registerSW, registeredToken, fetchApi]);

  const supportsNotifs = platform.isNative
    || !!(registerSW
      && window.Notification
      && navigator.permissions);
  useEffectOncePerDeps(() => {
    if (authState === 'out' || registeredToken || !supportsNotifs) {
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
    || registeredToken
    || !supportsNotifs
    || grantedPermissions !== false) {
    return null;
  }
  return supportsNotifs
    ? registerPushNotifs
    : null;
}
