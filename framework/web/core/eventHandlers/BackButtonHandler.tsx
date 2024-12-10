import type { BackButtonListenerEvent } from '@capacitor/app';
import { App } from '@capacitor/app';

import historyStateQueue from 'core/globalState/historyStateQueue';
import useEffectOncePerDeps from 'utils/useEffectOncePerDeps';

export default function BackButtonHandler() {
  const catchAsync = useCatchAsync();
  const { popHandlers } = useNavState();

  const latestPopHandlers = useLatest(popHandlers);
  useEffectOncePerDeps(() => {
    // Capacitor Android.
    App.addListener(
      'backButton',
      (event: BackButtonListenerEvent) => {
        while (latestPopHandlers.current.length) {
          const handler = latestPopHandlers.current.shift();
          if (handler?.()) {
            return;
          }
        }

        if (event.canGoBack) {
          historyStateQueue.back();
        } else {
          catchAsync(App.exitApp(), 'Capacitor.exitApp');
        }
      },
    )
      .catch(NOOP);
    // Error if remove() is called before Capacitor loads
  }, []);

  return null;
}
