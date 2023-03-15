import { SplashScreen } from '@capacitor/splash-screen';
import { Freeze } from 'react-freeze';

import StackWrapOuter from 'components/frame/stack/StackWrapOuter';
import HomeFrame from 'components/frame/home/HomeFrame';
import SlideUpsDeferred from 'components/frame/SlideUpsDeferred';
import AlertsDeferred from 'components/frame/AlertsDeferred';
import ToastsDeferred from 'components/frame/ToastsDeferred';
import pathToRoute from 'utils/pathToRoute';
import LoadingRoute from 'routes/LoadingRoute';
import LoadingHomeInnerRoute from 'routes/LoadingHomeInnerRoute';
import LoadingStackInnerRoute from 'routes/LoadingStackInnerRoute';
import useEffectIfReady from 'utils/hooks/useEffectIfReady';
import useTimeComponentPerf from 'utils/hooks/useTimeComponentPerf';
import { loadErrorLogger } from 'services/ErrorLogger';
import ErrorBoundary from 'components/ErrorBoundary';
import { RouteProvider } from 'stores/RouteStore';
import HomeRouteProvider from 'config/HomeRouteProvider';
import useUpdatedState from 'utils/hooks/useUpdatedState';
import customRoutes from 'config/routes';
import defaultRoutes from 'routes/defaultRoutes';

// Include in main bundle
import '@capacitor/splash-screen/dist/esm/web.js';
import 'components/frame/stack/StackWrapInner';

const renderedComponents = new Set<React.ComponentType>();

function _Route({
  routeConfig,
  matches,
  historyState,
  isFrozen,
  isHome,
  Component,
}: {
  routeConfig: RouteConfig,
  matches: Memoed<string[]>,
  historyState: HistoryState,
  isFrozen: boolean,
  isHome: boolean,
  Component: React.ComponentType,
}) {
  // This allows route transitions to begin before the route content renders
  const [skipRender, setSkipRender] = useState(renderedComponents.has(Component));
  useEffect(() => {
    setSkipRender(false);
    renderedComponents.add(Component);
  }, [historyState.key, setSkipRender, Component]);

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
            <HomeRouteProvider>
              <ErrorBoundary>
                <React.Suspense fallback={<LoadingHomeInnerRoute />}>
                  {skipRender ? null : <Component />}
                </React.Suspense>
              </ErrorBoundary>
            </HomeRouteProvider>
          )
          : (
            <StackWrapOuter>
              <ErrorBoundary>
                <React.Suspense fallback={<LoadingStackInnerRoute />}>
                  {skipRender ? null : <Component />}
                </React.Suspense>
              </ErrorBoundary>
            </StackWrapOuter>
          )}
      </Freeze>
    </RouteProvider>
  );
}

const Route = React.memo(_Route);

export default function Router() {
  const { curState, prevState } = useHistoryStore();
  const { isHome, wasHome } = useHomeNavStore();
  const {
    stackBot,
    stackTop,
    stackActive,
  } = useStacksNavStore();
  const { isReloadingAfterAuth, currentUserId, authState } = useAuthStore();
  const replacePath = useReplacePath();
  const catchAsync = useCatchAsync();

  const {
    routeConfig: botRouteConfig,
    matches: botMatches,
  } = pathToRoute(stackBot?.path);
  const {
    routeConfig: topRouteConfig,
    matches: topMatches,
  } = pathToRoute(stackTop?.path);
  const BotComponent = botRouteConfig?.Component;
  const TopComponent = topRouteConfig?.Component;
  const isBotAuth = !botRouteConfig?.auth || currentUserId;
  const isTopAuth = !topRouteConfig?.auth || currentUserId;

  useTimeComponentPerf(`Render Router:${stackActive?.path}`);

  const lastHomeState = useUpdatedState(
    isHome
      ? curState
      : (wasHome ? prevState : null),
    s => {
      if (isHome) {
        return curState;
      }
      if (wasHome) {
        return prevState;
      }
      return s;
    },
  );
  const homeTabsLastStates = useUpdatedState(
    useMemo(() => {
      const curRoute = pathToRoute(curState.path);
      const lastStates: ObjectOf<{
        routeConfig: RouteConfig,
        state: HistoryState | null,
        matches: Memoed<string[]>,
      }> = {};
      for (const routeConfig of [...customRoutes, ...defaultRoutes]) {
        if (routeConfig.homeTab) {
          lastStates[routeConfig.homeTab] = {
            routeConfig,
            state: curRoute.routeConfig === routeConfig
              ? curState
              : null,
            matches: curRoute.routeConfig === routeConfig
              ? curRoute.matches
              : EMPTY_ARR,
          };
        }
      }
      return lastStates;
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []),
    s => {
      if (!isHome) {
        return s;
      }
      const curRoute = pathToRoute(curState.path);
      if (!curRoute.routeConfig?.homeTab) {
        return s;
      }
      const curHomeTab = curRoute.routeConfig.homeTab;
      const curTabLastState = TS.defined(s[curRoute.routeConfig.homeTab]);
      if (curTabLastState.state === curState) {
        return s;
      }
      return markMemoed({
        ...s,
        [curHomeTab]: {
          ...curTabLastState,
          state: curState,
          matches: curRoute.matches,
        },
      });
    },
  );

  useEffectIfReady(
    () => {
      if (!isBotAuth || !isTopAuth) {
        replacePath('/login');
      }
      loadErrorLogger(currentUserId);

      setTimeout(() => {
        catchAsync(SplashScreen.hide(), 'SplashScreen.hide');
      }, 0);
    },
    [isBotAuth, isTopAuth, replacePath, catchAsync],
    authState !== 'fetching',
  );

  if ((authState !== 'in' || isReloadingAfterAuth)
    && (botRouteConfig?.auth || topRouteConfig?.auth)) {
    return (
      <LoadingRoute />
    );
  }

  // todo: mid/blocked when offscreen api is available, remove Freeze
  return (
    <>
      {TS.objValues(homeTabsLastStates)
        .map(({ routeConfig, state, matches }) => {
          if (!state) {
            return null;
          }
          const HomeComponent = routeConfig.Component;
          return (
            <Route
              key={state.key}
              routeConfig={routeConfig}
              matches={matches}
              historyState={state}
              isFrozen={state.key !== stackBot?.key && state !== lastHomeState}
              isHome
              Component={HomeComponent}
            />
          );
        })}
      <HomeFrame />
      {stackBot && !botRouteConfig?.homeTab && BotComponent && isBotAuth && (
        <Route
          key={stackBot.key}
          routeConfig={botRouteConfig}
          matches={botMatches}
          historyState={stackBot}
          isFrozen={curState.key !== stackBot.key && curState.key !== stackTop?.key}
          isHome={false}
          Component={BotComponent}
        />
      )}
      {stackTop && !topRouteConfig?.homeTab && TopComponent && isTopAuth && (
        <Route
          key={stackTop.key}
          routeConfig={topRouteConfig}
          matches={topMatches}
          historyState={stackTop}
          isFrozen={curState.key !== stackTop.key && curState.key !== stackBot?.key}
          isHome={false}
          Component={TopComponent}
        />
      )}
      <SlideUpsDeferred />
      <AlertsDeferred />
      <ToastsDeferred />
    </>
  );
}
