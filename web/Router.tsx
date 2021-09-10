import Alerts from 'components/frame/Alerts';
import Toasts from 'components/frame/Toasts';
import SlideUpWrap from 'components/frame/SlideUpWrap';
import StackWrapOuter from 'components/frame/StackWrapOuter';
import { SplashScreen } from '@capacitor/splash-screen';

import pathToRoute from 'lib/pathToRoute';
import HomeRouteWrap from 'routes/HomeRouteWrap';
import LoadingRoute from 'routes/LoadingRoute';
import useEffectIfReady from 'lib/hooks/useEffectIfReady';
import useTimeComponentPerf from 'lib/hooks/useTimeComponentPerf';
import { loadErrorLogger } from 'lib/ErrorLogger';
import ErrorBoundary from 'components/ErrorBoundary';

export default function Router() {
  const {
    stackBot,
    stackTop,
    stackActive,
  } = useStacksNavStore();
  const { isReplaced, curState } = useHistoryStore();
  const { isReloadingAfterAuth, currentUserId, loggedInStatus } = useAuthStore();
  const replacePath = useReplacePath();

  const {
    type: stackBotType,
    Component: StackBotComponent,
    auth: stackBotAuth,
    matches: stackBotMatches,
  } = pathToRoute(stackBot?.path) ?? {};
  const {
    type: stackTopType,
    Component: StackTopComponent,
    auth: stackTopAuth,
    matches: stackTopMatches,
  } = pathToRoute(stackTop?.path) ?? {};
  const isBotAuth = !stackBotAuth || currentUserId;
  const isTopAuth = !stackTopAuth || currentUserId;

  useTimeComponentPerf(`Router:${stackActive === 'top' ? stackTop?.path : stackBot?.path}`);

  useEffectIfReady(() => {
    if (!isBotAuth || !isTopAuth) {
      replacePath('/register');
    }
    loadErrorLogger(currentUserId);

    setTimeout(() => {
      // todo: mid/mid android appears to show splashscreen as background when expanding keyboard
      void SplashScreen.hide();
    }, 0);
  }, [isBotAuth, isTopAuth, replacePath], loggedInStatus !== 'unknown');

  if (!currentUserId
    && (loggedInStatus === 'unknown' || isReloadingAfterAuth)
    && (stackBotAuth || stackTopAuth)) {
    return (
      <LoadingRoute />
    );
  }

  const showSlide = !isReplaced || curState.path === '/register';
  // todo: mid/blocked when offscreen api is available, unmount home when not visible
  // todo: high/hard preserve home position after navigating multiple levels deep
  return (
    <>
      {stackBot && stackBotType === 'home' ? (
        <HomeRouteWrap>
          <ErrorBoundary>
            <React.Suspense fallback={<LoadingRoute />}>
              <StackBotComponent
                key={`${stackBot.path}?${stackBot.queryStr ?? ''}`}
                matches={stackBotMatches}
                path={stackBot.path}
                query={stackBot.query}
                queryStr={stackBot.queryStr}
                hash={stackBot.hash}
              />
            </React.Suspense>
          </ErrorBoundary>
        </HomeRouteWrap>
      ) : null}
      {stackBot && stackBotType !== 'home' && StackBotComponent && isBotAuth ? (
        <StackWrapOuter
          key={`${stackBot.id}|${stackBot.path}?${stackBot.queryStr ?? ''}#${stackBot.hash ?? ''}`}
          path={stackBot.path}
        >
          <ErrorBoundary>
            <React.Suspense fallback={<LoadingRoute />}>
              <StackBotComponent
                matches={stackBotMatches}
                path={stackBot.path}
                query={stackBot.query}
                queryStr={stackBot.queryStr}
                hash={stackBot.hash}
              />
            </React.Suspense>
          </ErrorBoundary>
        </StackWrapOuter>
      ) : null}
      {stackTop && stackTopType !== 'home' && StackTopComponent && isTopAuth ? (
        <StackWrapOuter
          key={`${stackTop.id}|${stackTop.path}?${stackTop.queryStr ?? ''}#${stackTop.hash ?? ''}`}
          slideIn={showSlide && stackActive === 'top'}
          slideOut={showSlide && stackActive === 'bot'}
          path={stackTop.path}
        >
          <ErrorBoundary>
            <React.Suspense fallback={<LoadingRoute />}>
              <StackTopComponent
                matches={stackTopMatches}
                path={stackTop.path}
                query={stackTop.query}
                queryStr={stackTop.queryStr}
                hash={stackTop.hash}
              />
            </React.Suspense>
          </ErrorBoundary>
        </StackWrapOuter>
      ) : null}
      <SlideUpWrap />
      <Alerts />
      <Toasts />
    </>
  );
}
