import Alerts from 'components/frame/Alerts';
import Toasts from 'components/frame/Toasts';
import SlideUpWrap from 'components/frame/SlideUpWrap';
import StackWrapOuter from 'components/frame/StackWrapOuter';

import pathToRoute from 'lib/pathToRoute';
import HomeRouteWrap from 'routes/HomeRouteWrap';
import LoadingRoute from 'routes/LoadingRoute';
import useEffectIfReady from 'lib/hooks/useEffectIfReady';
import useTimeComponentPerf from 'lib/hooks/useTimeComponentPerf';
import { loadErrorLogger } from 'lib/ErrorLogger';

export default function Router() {
  useTimeComponentPerf('Router');

  const currentUser = useCurrentUser();
  const {
    stackBot,
    stackTop,
    stackActive,
  } = useStacksNavStore();
  const { isReplaced, curState } = useHistoryStore();
  const { isReloadingAfterAuth, loggedInStatus } = useAuthStore();
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
  const isBotAuth = !stackBotAuth || currentUser;
  const isTopAuth = !stackTopAuth || currentUser;

  useEffectIfReady(() => {
    if (!isBotAuth || !isTopAuth) {
      replacePath('/login');
    }
    loadErrorLogger(currentUser?.id);
  }, [isBotAuth, isTopAuth, replacePath], loggedInStatus !== 'fetching');

  if (!currentUser
    && (loggedInStatus === 'fetching' || isReloadingAfterAuth)
    && (stackBotAuth || stackTopAuth)) {
    return (
      <LoadingRoute />
    );
  }

  const showSlide = !isReplaced || curState.path === '/login';
  // todo: mid/blocked when offscreen api is available, unmount home when not visible
  return (
    <>
      {stackBot && stackBotType === 'home' ? (
        <React.Suspense fallback={<LoadingRoute />}>
          <HomeRouteWrap>
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
          </HomeRouteWrap>
        </React.Suspense>
      ) : null}
      {stackBot && stackBotType !== 'home' && StackBotComponent && isBotAuth ? (
        <StackWrapOuter key={`${stackBot.path}?${stackBot.queryStr ?? ''}`}>
          <React.Suspense fallback={<LoadingRoute />}>
            <StackBotComponent
              matches={stackBotMatches}
              path={stackBot.path}
              query={stackBot.query}
              queryStr={stackBot.queryStr}
              hash={stackBot.hash}
            />
          </React.Suspense>
        </StackWrapOuter>
      ) : null}
      {stackTop && stackTopType !== 'home' && StackTopComponent && isTopAuth ? (
        <StackWrapOuter
          key={`${stackTop.path}?${stackTop.queryStr ?? ''}`}
          slideIn={showSlide && stackActive === 'top'}
          slideOut={showSlide && stackActive === 'bot'}
        >
          <React.Suspense fallback={<LoadingRoute />}>
            <StackTopComponent
              matches={stackTopMatches}
              path={stackTop.path}
              query={stackTop.query}
              queryStr={stackTop.queryStr}
              hash={stackTop.hash}
            />
          </React.Suspense>
        </StackWrapOuter>
      ) : null}
      <SlideUpWrap />
      <Alerts />
      <Toasts />
    </>
  );
}
