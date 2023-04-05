import { HOME_URL } from 'settings';
import useSWVersionLS from 'hooks/localStorage/useSWVersionLS';
import useEffectInitialMount from 'hooks/useEffectInitialMount';

export default function useRegisterSW() {
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const [lastSWVersion, setSWVersion] = useSWVersionLS();

  useEffectInitialMount(() => {
    wrapPromise(
      (async () => {
        const newRegistration = await navigator.serviceWorker.register(
          // Note: must be same origin as app
          `${HOME_URL}/js/sw.js`,
        );
        const jsVersion = TS.parseIntOrNull(process.env.JS_VERSION);
        if (lastSWVersion !== jsVersion) {
          await newRegistration.update();
          setSWVersion(jsVersion ?? 0);
        }

        setRegistration(newRegistration);
      })(),
      'warn',
      'useRegisterSW',
    );
  }, [lastSWVersion, setSWVersion]);

  return registration;
}
