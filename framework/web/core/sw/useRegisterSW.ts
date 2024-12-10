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
    ? cb
    : null;
}
