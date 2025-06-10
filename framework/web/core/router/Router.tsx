import { RoutesRenderer } from 'config/components';
import SlideUpsDeferred from 'core/frame/SlideUpsDeferred';
import ModalsDeferred from 'core/frame/ModalsDeferred';
import LightboxDeferred from 'core/frame/LightboxDeferred';
import ToastsDeferred from 'core/frame/ToastsDeferred';
import DebugLogPanelDeferred from 'core/frame/DebugLogPanelDeferred';
import EventHandlersDeferred from 'core/eventHandlers/EventHandlersDeferred';
import useTimeComponentPerf from 'utils/useTimeComponentPerf';
import iosFocusHackRef from 'core/globalState/iosFocusHackRef';
import detectPlatform from 'utils/detectPlatform';
import { HOME_URL } from 'consts/server';

import styles from './Router.scss';

const PATH_ID_REGEX = /^\d+$/;

function IosFocusHack() {
  return (
    <input
      ref={iosFocusHackRef}
      className={styles.inputHack}
      aria-hidden
    />
  );
}

const Popups = React.memo(function Popups() {
  return (
    <>
      <SlideUpsDeferred />
      <ModalsDeferred />
      <LightboxDeferred />
      <ToastsDeferred />
      {!process.env.PRODUCTION && <DebugLogPanelDeferred />}
    </>
  );
});

// todo: low/med navigation fails if debugger triggers
export default function Router() {
  const { pendingNavState, deferredNavState, isNavigating } = useHistoryStore();
  const { curState, prevState } = pendingNavState;
  const authState = useAuthState();

  useTimeComponentPerf(`Render Router:${curState.path}`);

  useEffect(() => {
    if (authState === 'fetching') {
      return;
    }

    const pathParts = curState.path.split('/');
    let popped = false;
    while (pathParts.length > 1 && PATH_ID_REGEX.test(pathParts.at(-1))) {
      pathParts.pop();
      popped = true;
    }
    if (popped) {
      pathParts.push('id');
    }
    const pathPrefix = pathParts
      .map(part => (PATH_ID_REGEX.test(part) ? 'id' : part))
      .join('/');

    const pageName = curState.path === '/'
      ? (authState === 'out' ? 'unauth home' : 'auth home')
      : pathPrefix;
    EventLogger.track(`Nav: ${pageName}`, {
      URL: HOME_URL + curState.path,
      'Prev Path': prevState ? HOME_URL + prevState.path : null,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [curState, authState]);

  return (
    <>
      {detectPlatform().os === 'ios' && <IosFocusHack />}

      <RoutesRenderer
        pendingNavState={pendingNavState}
        deferredNavState={deferredNavState}
        isNavigating={isNavigating}
      />

      <Popups />
      <EventHandlersDeferred />
    </>
  );
}
