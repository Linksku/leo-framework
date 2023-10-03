import { SplashScreen } from '@capacitor/splash-screen';
import { Freeze } from 'react-freeze';

import StackWrapOuter from 'components/frame/stack/StackWrapOuter';
import StackWrapInner from 'components/frame/stack/StackWrapInner';
import HomeHeader from 'components/frame/home/HomeHeader';
import HomeFooter from 'components/frame/home/HomeFooter';
import SlideUpsDeferred from 'components/frame/SlideUpsDeferred';
import AlertsDeferred from 'components/frame/AlertsDeferred';
import ToastsDeferred from 'components/frame/ToastsDeferred';
import pathToRoute, { MatchedRoute, allRouteConfigs } from 'utils/pathToRoute';
import LoadingRoute from 'routes/LoadingRoute';
import LoadingHomeInnerRoute from 'routes/LoadingHomeInnerRoute';
import LoadingStackInnerRoute from 'routes/LoadingStackInnerRoute';
import useEffectIfReady from 'hooks/useEffectIfReady';
import useTimeComponentPerf from 'hooks/useTimeComponentPerf';
import { loadErrorLogger } from 'services/ErrorLogger';
import ErrorBoundary from 'components/ErrorBoundary';
import ErrorPage from 'components/ErrorPage';
import { RouteProvider } from 'stores/RouteStore';
import { BatchImagesLoadProvider } from 'stores/BatchImagesLoadStore';
import { useIsHome } from 'stores/HomeNavStore';
import useUpdatedState from 'hooks/useUpdatedState';

// Include in main bundle
import '@capacitor/splash-screen/dist/esm/web.js';
import 'components/frame/stack/StackWrapInner';

import styles from './RouterStyles.scss';

const FROZEN_PATHS_PER_HOME_TAB = 3;
const seenComponents = new Set<React.ComponentType>();

const Route = React.memo(function _Route({
  routeConfig,
  matches,
  historyState,
  isFrozen = false,
  isCurStack,
  isHome,
  Component,
}: {
  routeConfig: RouteConfig,
  matches: Stable<string[]>,
  historyState: HistoryState,
  isFrozen?: boolean,
  isCurStack: boolean,
  isHome: boolean,
  Component: React.ComponentType,
}) {
  // This allows route transitions to begin before the route content renders
  // If component was never loaded, render immediately to run import()
  const [skipRender, setSkipRender] = useState(
    !isCurStack || seenComponents.has(Component),
  );
  useEffect(() => {
    setSkipRender(false);
    seenComponents.add(Component);
  }, [historyState.key, Component]);

  const inner = skipRender
    ? null
    : (
      <BatchImagesLoadProvider>
        <Component />
      </BatchImagesLoadProvider>
    );
  return (
    <RouteProvider
      routeConfig={routeConfig}
      matches={matches}
      initialHistoryState={historyState}
      isFrozen={isFrozen}
    >
      <Freeze
        freeze={isFrozen}
      >
        {isHome
          ? (
            <ErrorBoundary
              renderLoading={() => <LoadingHomeInnerRoute />}
              renderError={msg => (
                <ErrorPage
                  title="Error"
                  content={msg}
                />
              )}
            >
              {inner}
            </ErrorBoundary>
          )
          : (
            <StackWrapOuter>
              <ErrorBoundary
                renderLoading={() => <LoadingStackInnerRoute />}
                renderError={msg => (
                  <StackWrapInner
                    title="Error"
                  >
                    <ErrorPage
                      title="Error"
                      content={msg}
                    />
                  </StackWrapInner>
                )}
              >
                {inner}
              </ErrorBoundary>
            </StackWrapOuter>
          )}
      </Freeze>
    </RouteProvider>
  );
});

function IosFocusHack() {
  const { iosFocusHackRef } = useUIFrameStore();

  return (
    <input
      ref={iosFocusHackRef}
      className={styles.inputHack}
      aria-hidden
    />
  );
}

const HomeTabs = React.memo(function _HomeTabs() {
  const { homeState, isHome } = useHomeNavStore();
  const {
    curStack,
    backStack,
  } = useStacksNavStore();

  const homeTabsLastStates = useUpdatedState(
    () => {
      const lastStates: Map<string, {
        routeConfig: RouteConfig,
        lastPaths: {
          key: string,
          state: HistoryState,
          matches: Stable<string[]>,
        }[],
        lastPathsAccessOrder: string[],
      }> = markStable(new Map());
      for (const routeConfig of allRouteConfigs) {
        if (routeConfig.homeTab) {
          lastStates.set(routeConfig.homeTab, {
            routeConfig,
            lastPaths: [],
            lastPathsAccessOrder: [],
          });
        }
      }
      return lastStates;
    },
    s => {
      const lastRoute = pathToRoute(homeState?.path);
      if (!homeState || !lastRoute?.routeConfig?.homeTab) {
        return s;
      }

      const lastTabLastState = TS.defined(s.get(lastRoute.routeConfig.homeTab));
      if (TS.last(lastTabLastState.lastPathsAccessOrder) === homeState.key) {
        return s;
      }

      const newAccessOrder = [
        ...lastTabLastState.lastPathsAccessOrder.filter(k => k !== homeState.key),
        homeState.key,
      ].slice(-FROZEN_PATHS_PER_HOME_TAB);
      const newLastStates = new Map(s);
      newLastStates.set(lastRoute.routeConfig.homeTab, {
        routeConfig: lastTabLastState.routeConfig,
        lastPaths: lastTabLastState.lastPaths.some(p => p.key === homeState.key)
          // Don't reorder lastPaths to maintain scroll position
          ? lastTabLastState.lastPaths
          : [
            ...lastTabLastState.lastPaths.filter(p => newAccessOrder.includes(p.key)),
            {
              key: homeState.key,
              state: homeState,
              matches: lastRoute.matches,
            },
          ],
        lastPathsAccessOrder: newAccessOrder,
      });
      return newLastStates;
    },
  );

  return [...homeTabsLastStates.values()]
    .flatMap(({ routeConfig, lastPaths }) => {
      if (!lastPaths.length) {
        return null;
      }
      const HomeComponent = routeConfig.Component;
      return lastPaths.map(p => (
        <Route
          key={p.key}
          routeConfig={routeConfig}
          matches={p.matches}
          historyState={p.state}
          isCurStack={curStack?.key === p.state.key}
          isFrozen={isHome
            ? p.state.key !== curStack?.key
            : p.state.key !== backStack?.key}
          isHome
          Component={HomeComponent}
        />
      ));
    });
});

const Stacks = React.memo(function _Stacks({ curRoute, backRoute, forwardRoute }: {
  curRoute: MatchedRoute,
  backRoute: MatchedRoute,
  forwardRoute: MatchedRoute,
}) {
  const {
    curStack,
    backStack,
    forwardStack,
  } = useStacksNavStore();
  const currentUserId = useCurrentUserId();

  const {
    routeConfig: curRouteConfig,
    matches: curMatches,
  } = curRoute;
  const {
    routeConfig: backRouteConfig,
    matches: backMatches,
  } = backRoute;
  const {
    routeConfig: forwardRouteConfig,
    matches: forwardMatches,
  } = forwardRoute;
  const CurComponent = curRouteConfig?.Component;
  const ForwardComponent = forwardRouteConfig?.Component;
  const BackComponent = backRouteConfig?.Component;
  const isCurAuth = !curRouteConfig?.auth || currentUserId;
  const isForwardAuth = !forwardRouteConfig?.auth || currentUserId;
  const isBackAuth = !backRouteConfig?.auth || currentUserId;

  return (
    <>
      {backStack && !backRouteConfig?.homeTab && BackComponent && isBackAuth && (
        <Route
          key={backStack.key}
          routeConfig={backRouteConfig}
          matches={backMatches}
          historyState={backStack}
          isCurStack={false}
          isHome={false}
          Component={BackComponent}
        />
      )}
      {curStack && !curRouteConfig?.homeTab && CurComponent && isCurAuth && (
        <Route
          key={curStack.key}
          routeConfig={curRouteConfig}
          matches={curMatches}
          historyState={curStack}
          isCurStack
          isHome={false}
          Component={CurComponent}
        />
      )}
      {forwardStack && !forwardRouteConfig?.homeTab && ForwardComponent && isForwardAuth && (
        <Route
          key={forwardStack.key}
          routeConfig={forwardRouteConfig}
          matches={forwardMatches}
          historyState={forwardStack}
          isCurStack={false}
          isHome={false}
          Component={ForwardComponent}
        />
      )}
    </>
  );
});

export default function Router() {
  const isHome = useIsHome();
  const {
    curStack,
    backStack,
    forwardStack,
  } = useStacksNavStore();
  const { isReloadingAfterAuth, currentUserId, authState } = useAuthStore();
  const replacePath = useReplacePath();
  const catchAsync = useCatchAsync();

  const curRoute = pathToRoute(curStack.path);
  const backRoute = pathToRoute(backStack?.path);
  const forwardRoute = pathToRoute(forwardStack?.path);
  const isCurAuth = !curRoute.routeConfig?.auth || currentUserId;
  const isForwardAuth = !forwardRoute.routeConfig?.auth || currentUserId;

  useTimeComponentPerf(`Render Router:${curStack.path}`);

  const [skipRenderHome, setSkipRenderHome] = useState(!isHome);
  useEffect(() => {
    setSkipRenderHome(false);
  }, []);

  useEffectIfReady(
    () => {
      if (!isCurAuth || !isForwardAuth) {
        replacePath('/login');
      }
      loadErrorLogger(currentUserId);

      setTimeout(() => {
        catchAsync(SplashScreen.hide(), 'SplashScreen.hide');
      }, 0);
    },
    [isCurAuth, isForwardAuth, replacePath, catchAsync],
    authState !== 'fetching',
  );

  if ((authState !== 'in' || isReloadingAfterAuth)
    && (curRoute.routeConfig?.auth || forwardRoute.routeConfig?.auth)) {
    return (
      <LoadingRoute />
    );
  }

  // todo: mid/blocked when offscreen api is available, remove Freeze
  return (
    <>
      <IosFocusHack />

      <HomeTabs />
      {!skipRenderHome && <HomeHeader />}
      {!skipRenderHome && <HomeFooter />}

      <Stacks
        curRoute={curRoute}
        backRoute={backRoute}
        forwardRoute={forwardRoute}
      />

      <SlideUpsDeferred />
      <AlertsDeferred />
      <ToastsDeferred />
    </>
  );
}
