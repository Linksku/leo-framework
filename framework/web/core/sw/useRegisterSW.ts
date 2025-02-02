import {
  FIREBASE_APP_ID,
  FIREBASE_KEY,
  FIREBASE_MESSAGING_SENDER_ID,
  FIREBASE_PROJECT_ID,
} from 'config/config';
import { HOME_URL } from 'consts/server';
import useSWVersionStorage from 'core/storage/useSWVersionStorage';

export default function useRegisterSW() {
  const [lastSWVersion, setSWVersion] = useSWVersionStorage();

  const cb = useCallback(async () => {
    try {
      const newRegistration = await navigator.serviceWorker.register(
        // Note: must be same origin as app
        `${HOME_URL}/js/sw.js`,
      );
      const jsVersion = TS.parseIntOrNull(process.env.JS_VERSION);
      if (lastSWVersion !== jsVersion) {
        await newRegistration.update();
        setSWVersion(jsVersion ?? 0);
      }

      return newRegistration;
    } catch (err) {
      ErrorLogger.warn(err, { ctx: 'useRegisterSW' });
    }
    return null;
  }, [lastSWVersion, setSWVersion]);

  return navigator.serviceWorker
    && FIREBASE_PROJECT_ID
    && FIREBASE_APP_ID
    && FIREBASE_KEY
    && FIREBASE_MESSAGING_SENDER_ID
    ? cb
    : null;
}
