import { SplashScreen } from '@capacitor/splash-screen';

import StackWrapOuter from 'components/frame/StackWrapOuter';
import HomeWrapOuter from 'components/frame/homeWrap/HomeWrapOuter';
import SlideUpsDeferred from 'components/frame/SlideUpsDeferred';
import AlertsDeferred from 'components/frame/AlertsDeferred';
import ToastsDeferred from 'components/frame/ToastsDeferred';
import pathToRoute from 'utils/pathToRoute';
import LoadingRoute from 'routes/LoadingRoute';
import useEffectIfReady from 'utils/hooks/useEffectIfReady';
import useTimeComponentPerf from 'utils/hooks/useTimeComponentPerf';
import { loadErrorLogger } from 'services/ErrorLogger';
import ErrorBoundary from 'components/ErrorBoundary';
import { RouteProvider } from 'stores/RouteStore';
import HomeRouteProvider from 'config/HomeRouteProvider';

// Include in main bundle.
import 'components/frame/StackWrapInner';

import styles from './RouterStyles.scss';

export default function Router() {
  const { lastHomeHistoryState } = useHomeNavStore();
  const {
    stackBot,
    stackTop,
    stackActive,
  } = useStacksNavStore();
  const { isReloadingAfterAuth, currentUserId, authState } = useAuthStore();
  const replacePath = useReplacePath();

  // Home state might be same as bot.
  const {
    routeConfig: homeRouteConfig,
    matches: homeMatches,
  } = pathToRoute(lastHomeHistoryState?.path);
  const {
    routeConfig: botRouteConfig,
    matches: botMatches,
  } = pathToRoute(stackBot?.path);
  const {
    routeConfig: topRouteConfig,
    matches: topMatches,
  } = pathToRoute(stackTop?.path);
  const HomeComponent = homeRouteConfig?.Component;
  const BotComponent = botRouteConfig?.Component;
  const TopComponent = topRouteConfig?.Component;
  const isBotAuth = !botRouteConfig?.auth || currentUserId;
  const isTopAuth = !topRouteConfig?.auth || currentUserId;

  useTimeComponentPerf(`Render Router:${stackActive?.path}`);

  useEffectIfReady(() => {
    if (!isBotAuth || !isTopAuth) {
      replacePath('/register');
    }
    loadErrorLogger(currentUserId);

    setTimeout(() => {
      // todo: mid/mid android appears to show splashscreen as background when expanding keyboard
      wrapPromise(SplashScreen.hide(), 'warn', 'SplashScreen.hide');
    }, 0);
  }, [isBotAuth, isTopAuth, replacePath], authState !== 'fetching');

  if ((authState !== 'in' || isReloadingAfterAuth)
    && (botRouteConfig?.auth || topRouteConfig?.auth)) {
    return (
      <LoadingRoute />
    );
  }

  // todo: mid/blocked when offscreen api is available, unmount home when not visible
  return (
    <>
      {lastHomeHistoryState && HomeComponent ? (
        <div className={styles.homeWrap}>
          <RouteProvider
            key={lastHomeHistoryState.key}
            routeConfig={homeRouteConfig}
            matches={homeMatches}
            initialHistoryState={lastHomeHistoryState}
          >
            <HomeRouteProvider>
              <ErrorBoundary>
                <React.Suspense fallback={<LoadingRoute />}>
                  <HomeComponent />
                </React.Suspense>
              </ErrorBoundary>
            </HomeRouteProvider>
          </RouteProvider>
          <HomeWrapOuter />
        </div>
      ) : null}
      {stackBot && botRouteConfig?.type !== 'home' && BotComponent && isBotAuth ? (
        <RouteProvider
          key={stackBot.key}
          routeConfig={botRouteConfig}
          matches={botMatches}
          initialHistoryState={stackBot}
        >
          <StackWrapOuter>
            <ErrorBoundary>
              <React.Suspense fallback={<LoadingRoute />}>
                <BotComponent />
              </React.Suspense>
            </ErrorBoundary>
          </StackWrapOuter>
        </RouteProvider>
      ) : null}
      {stackTop && topRouteConfig?.type !== 'home' && TopComponent && isTopAuth ? (
        <RouteProvider
          key={stackTop.key}
          routeConfig={topRouteConfig}
          matches={topMatches}
          initialHistoryState={stackTop}
        >
          <StackWrapOuter>
            <ErrorBoundary>
              <React.Suspense fallback={<LoadingRoute />}>
                <TopComponent />
              </React.Suspense>
            </ErrorBoundary>
          </StackWrapOuter>
        </RouteProvider>
      ) : null}
      <SlideUpsDeferred />
      <AlertsDeferred />
      <ToastsDeferred />
    </>
  );
}
