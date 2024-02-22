import type { BackButtonListenerEvent } from '@capacitor/app';
import { App as Capacitor } from '@capacitor/app';

import useEffectOncePerDeps from 'hooks/useEffectOncePerDeps';

export default function BackButtonHandler() {
  const catchAsync = useCatchAsync();
  const { popHandlers } = useHistoryStore();

  const latestPopHandlers = useLatest(popHandlers);
  useEffectOncePerDeps(() => {
    // Capacitor Android.
    Capacitor.addListener(
      'backButton',
      (event: BackButtonListenerEvent) => {
        while (latestPopHandlers.current.length) {
          const handler = latestPopHandlers.current.shift();
          if (handler?.()) {
            return;
          }
        }

        if (event.canGoBack) {
          window.history.back();
        } else {
          catchAsync(Capacitor.exitApp(), 'Capacitor.exitApp');
        }
      },
    )
      .catch(NOOP);
    // Error if remove() is called before Capacitor loads
  }, []);

  return null;
}
