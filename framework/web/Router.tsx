import { SplashScreen } from '@capacitor/splash-screen';

import Alerts from 'components/frame/Alerts';
import Toasts from 'components/frame/Toasts';
import SlideUpWrap from 'components/frame/SlideUpWrap';
import StackWrapOuter from 'components/frame/StackWrapOuter';
import pathToRoute from 'utils/pathToRoute';
import HomeRouteWrap from 'routes/HomeRouteWrap';
import LoadingRoute from 'routes/LoadingRoute';
import useEffectIfReady from 'utils/hooks/useEffectIfReady';
import useTimeComponentPerf from 'utils/hooks/useTimeComponentPerf';
import { loadErrorLogger } from 'services/ErrorLogger';
import ErrorBoundary from 'components/ErrorBoundary';
import { RouteProvider } from 'stores/RouteStore';

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
  // todo: low/mid clean up home/bot stack logic
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

  useTimeComponentPerf(`Router:${stackActive?.path}`);

  useEffectIfReady(() => {
    if (!isBotAuth || !isTopAuth) {
      replacePath('/register');
    }
    loadErrorLogger(currentUserId);

    setTimeout(() => {
      // todo: mid/mid android appears to show splashscreen as background when expanding keyboard
      void SplashScreen.hide();
    }, 0);
  }, [isBotAuth, isTopAuth, replacePath], authState !== 'unknown');

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
        <RouteProvider
          historyState={lastHomeHistoryState}
          routeConfig={homeRouteConfig}
          matches={homeMatches}
        >
          <HomeRouteWrap>
            <ErrorBoundary>
              <React.Suspense fallback={<LoadingRoute />}>
                <HomeComponent
                  key={`${lastHomeHistoryState.path}?${lastHomeHistoryState.queryStr ?? ''}`}
                />
              </React.Suspense>
            </ErrorBoundary>
          </HomeRouteWrap>
        </RouteProvider>
      ) : null}
      {stackBot && botRouteConfig?.type !== 'home' && BotComponent && isBotAuth ? (
        <RouteProvider
          key={`${stackBot.id}|${stackBot.path}?${stackBot.queryStr ?? ''}#${stackBot.hash ?? ''}`}
          historyState={stackBot}
          routeConfig={botRouteConfig}
          matches={botMatches}
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
          key={`${stackTop.id}|${stackTop.path}?${stackTop.queryStr ?? ''}#${stackTop.hash ?? ''}`}
          historyState={stackTop}
          routeConfig={topRouteConfig}
          matches={topMatches}
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
      <SlideUpWrap />
      <Alerts />
      <Toasts />
    </>
  );
}
