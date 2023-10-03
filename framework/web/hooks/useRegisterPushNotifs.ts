import { Capacitor } from '@capacitor/core';
import { Device } from '@capacitor/device';

import useRegisterSW from 'hooks/useRegisterSW';
import useEffectIfReady from 'hooks/useEffectIfReady';

let registeredToken: string | null = null;

export default function useRegisterPushNotifs() {
  const didRun = useRef(false);
  const registration = useRegisterSW();

  const { fetchApi } = useDeferredApi(
    'registerPushNotifToken',
    useConst({
      platform: 'web',
    }),
    {
      onFetch(_, { registrationToken }) {
        registeredToken = registrationToken;
      },
    },
  );

  useEffectIfReady(() => {
    if (didRun.current || Capacitor.isNativePlatform()) {
      return;
    }
    didRun.current = true;

    wrapPromise(
      (async () => {
        const {
          module: { default: registerPushNotifs },
          deviceId,
        } = await promiseObj({
          module: import('services/registerPushNotifs'),
          deviceId: Device.getId(),
        });
        let registrationToken: string | null = null;
        try {
          registrationToken = await registerPushNotifs(registration);
        } catch (err) {
          ErrorLogger.warn(err instanceof Error ? err : new Error('Failed to register push notifs'));
        }

        if (registrationToken && registrationToken !== registeredToken) {
          fetchApi({
            deviceId: deviceId.identifier,
            registrationToken,
          });
        }
      })(),
      'warn',
      'useRegisterPushNotifs',
    );
  }, [registration, fetchApi], !!registration);
}
