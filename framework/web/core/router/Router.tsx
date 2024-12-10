import { Freeze } from 'react-freeze';

import type { NavState } from 'stores/history/HistoryStore';
import HomeHeader from 'core/frame/home/HomeHeader';
import HomeFooter from 'core/frame/home/HomeFooter';
import HomeSidebar from 'core/frame/home/HomeSidebar';
import SlideUpsDeferred from 'core/frame/SlideUpsDeferred';
import AlertsDeferred from 'core/frame/AlertsDeferred';
import LightboxDeferred from 'core/frame/LightboxDeferred';
import ToastsDeferred from 'core/frame/ToastsDeferred';
import DebugLogPanelDeferred from 'core/frame/DebugLogPanelDeferred';
import EventHandlersDeferred from 'core/eventHandlers/EventHandlersDeferred';
import pathToRoute, { allRouteConfigs } from 'core/router/pathToRoute';
import useTimeComponentPerf from 'utils/useTimeComponentPerf';
import useAccumulatedVal from 'utils/useAccumulatedVal';
import iosFocusHackRef from 'core/globalState/iosFocusHackRef';
import detectPlatform from 'utils/detectPlatform';
import { HOME_URL } from 'consts/server';
import Route from './Route';

import styles from './Router.scss';

const FROZEN_PATHS_PER_HOME_TAB = 3;

const PATH_ID_REGEX = /^\d+$/;

const initialHomeLastStates = new Map<string, {
  routeConfig: RouteConfig,
  lastPaths: {
    key: string,
    state: HistoryState,
    matches: Stable<string[]>,
  }[],
  lastPathsAccessOrder: string[],
}>();
for (const routeConfig of allRouteConfigs) {
  if (routeConfig.homeTab) {
    initialHomeLastStates.set(routeConfig.homeTab, {
      routeConfig,
      lastPaths: [],
      lastPathsAccessOrder: [],
    });
  }
}

function IosFocusHack() {
  return (
    <input
      ref={iosFocusHackRef}
      className={styles.inputHack}
      aria-hidden
    />
  );
}

const HomeTabs = React.memo(function HomeTabs({ pendingNavState, deferredNavState, isNavigating }: {
  pendingNavState: NavState,
  deferredNavState: NavState,
  isNavigating: boolean,
}) {
  const {
    direction,
    curState,
    backStates,
    forwardStates,
    isHome,
    isPrevHome,
    lastHomeState,
  } = pendingNavState;
  const backState = backStates.at(0);
  const forwardState = forwardStates.at(0);

  const homeTabsLastStates = useAccumulatedVal(
    initialHomeLastStates,
    s => {
      if (!lastHomeState) {
        return s;
      }
      const lastRoute = pathToRoute(lastHomeState.path);
      if (!lastRoute.routeConfig.homeTab) {
        return s;
      }
      const lastTabLastState = TS.defined(s.get(lastRoute.routeConfig.homeTab));
      if (lastTabLastState.lastPathsAccessOrder.at(-1) === lastHomeState.key) {
        return s;
      }

      const newAccessOrder = [
        ...lastTabLastState.lastPathsAccessOrder.filter(k => k !== lastHomeState.key),
        lastHomeState.key,
      ].slice(-FROZEN_PATHS_PER_HOME_TAB);
      const newLastStates = new Map(s);
      newLastStates.set(lastRoute.routeConfig.homeTab, {
        routeConfig: lastTabLastState.routeConfig,
        lastPaths: lastTabLastState.lastPaths.some(p => p.key === lastHomeState.key)
          // Don't reorder lastPaths to maintain scroll position
          ? lastTabLastState.lastPaths
          : [
            ...lastTabLastState.lastPaths.filter(p => newAccessOrder.includes(p.key)),
            {
              key: lastHomeState.key,
              state: lastHomeState,
              matches: lastRoute.matches,
            },
          ],
        lastPathsAccessOrder: newAccessOrder,
      });
      return newLastStates;
    },
  );

  return [...homeTabsLastStates.values()]
    .filter(state => state.lastPaths.length)
    .flatMap(({ routeConfig, lastPaths }) => lastPaths.map(p => {
      const historyState = p.state;
      const isVisible = isHome
        ? historyState.key === curState.key
          && (!isNavigating || !isPrevHome)
        : (direction === 'forward' && historyState.key === backState?.key)
          || (direction === 'forward' && !isNavigating && historyState.key === forwardState?.key)
          || (direction === 'back' && historyState.key === forwardState?.key)
          || (direction === 'back' && !isNavigating && historyState.key === backState?.key);
      return (
        <Route
          key={p.key}
          routeConfig={routeConfig}
          matches={p.matches}
          historyState={historyState}
          isFrozen={!isVisible}
          pendingNavState={pendingNavState}
          deferredNavState={deferredNavState}
        />
      );
    }));
});

const Stacks = React.memo(function Stacks({ pendingNavState, deferredNavState, isNavigating }: {
  pendingNavState: NavState,
  deferredNavState: NavState,
  isNavigating: boolean,
}) {
  const {
    curState,
    backStates,
    forwardStates,
    direction,
  } = pendingNavState;
  const backState = backStates.at(0);
  const forwardState = forwardStates.at(0);

  const allStates = [
    ...backStates.slice().reverse(),
    curState,
    ...forwardStates,
  ];
  return allStates.map(state => {
    const route = pathToRoute(state.path);
    if (route.routeConfig.homeTab) {
      return null;
    }

    /*
    back=stack1, cur=stack2, forward=stack3 -> back=stack2, cur=stack3, forward=stack4:
    immediately: freeze stack1
    deferred: unfreeze stack4

    back=stack2, cur=stack3, forward=stack4 -> back=stack1, cur=stack2, forward=stack3:
    immediately: freeze stack4
    deferred: unfreeze stack1
    */
    const isVisible = state.key === curState.key
      || state.key === deferredNavState.curStack.key
      || (direction === 'forward' && state.key === backState?.key)
      || (direction === 'forward' && !isNavigating && state.key === forwardState?.key)
      || (direction === 'back' && state.key === forwardState?.key)
      || (direction === 'back' && !isNavigating && state.key === backState?.key);
    return (
      <Route
        key={state.key}
        routeConfig={route.routeConfig}
        matches={route.matches}
        historyState={state}
        isFrozen={!isVisible}
        pendingNavState={pendingNavState}
        deferredNavState={deferredNavState}
      />
    );
  });
});

const Popups = React.memo(function Popups() {
  return (
    <>
      <SlideUpsDeferred />
      <AlertsDeferred />
      <LightboxDeferred />
      <ToastsDeferred />
      {!process.env.PRODUCTION && <DebugLogPanelDeferred />}
    </>
  );
});

// todo: low/mid navigation fails if debugger triggers
export default function Router() {
  const { pendingNavState, deferredNavState, isNavigating } = useHistoryStore();
  const {
    direction,
    isHome,
    isBackHome,
    isForwardHome,
    curState,
    prevState,
  } = pendingNavState;
  const authState = useAuthState();

  useTimeComponentPerf(`Render Router:${curState.path}`);

  const [skipRenderHome, setSkipRenderHome] = useState(!isHome);
  useEffect(() => {
    setSkipRenderHome(false);
  }, []);

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

    const pageName = isHome && !pathPrefix
      ? (authState === 'out' ? 'unauth home' : 'feed')
      : pathPrefix;
    EventLogger.track(`Nav: ${pageName}`, {
      URL: HOME_URL + curState.path,
      'Prev Path': prevState ? HOME_URL + prevState.path : null,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [curState, authState]);

  const isHomeVisible = isHome
    || deferredNavState.isHome
    || (direction === 'forward' && isBackHome)
    || (direction === 'forward' && !isNavigating && isForwardHome)
    || (direction === 'back' && isForwardHome)
    || (direction === 'back' && !isNavigating && isBackHome);
  return (
    <>
      {detectPlatform().os === 'ios' && <IosFocusHack />}

      {/* Stacks first for SEO */}
      <Stacks
        pendingNavState={pendingNavState}
        deferredNavState={deferredNavState}
        isNavigating={isNavigating}
      />

      {!skipRenderHome && (
        <>
          {/* Don't freeze HomeTabs because wasFrozen in RouteStore would be wrong */}
          <HomeTabs
            pendingNavState={pendingNavState}
            deferredNavState={deferredNavState}
            isNavigating={isNavigating}
          />
          <Freeze freeze={!isHomeVisible}>
            <HomeHeader />
            <HomeFooter />
            <HomeSidebar />
          </Freeze>
        </>
      )}

      <Popups />
      <EventHandlersDeferred />
    </>
  );
}
