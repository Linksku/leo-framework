import { Freeze } from 'react-freeze';

import type { NavState } from 'stores/history/HistoryStore';
import { RouteRenderer } from 'config/components';
import { RouteProvider } from 'stores/RouteStore';
import { BatchImagesLoadProvider } from 'stores/BatchImagesLoadStore';
import useIsFirstRender from 'utils/useIsFirstRender';
import usePrevious from 'utils/usePrevious';

type RouteProps = {
  routeConfig: RouteConfig,
  matches: Stable<string[]>,
  historyState: HistoryState,
  // Don't start freezing during low-pri render: https://github.com/facebook/react/issues/29126
  isFrozen?: boolean,
};

const Route = React.memo(function Route({
  routeConfig,
  matches,
  historyState,
  isFrozen = false,
  navState,
}: RouteProps & { navState: NavState }) {
  const Component = routeConfig.getComponent();
  const authState = useAuthState();
  // Allows route transition animations to begin before the route content renders
  const [skipRender, setSkipRender] = useState(() => {
    const renderImmediately = historyState.key === navState.curState.key && (
      // First page load
      navState.direction === 'none'
      // Maybe refreshed
      || navState.isInitialLoad
      || navState.replacedNavCount != null);
    return !renderImmediately;
  });

  useEffect(() => {
    if (skipRender) {
      // React.startTransition(() => {
      setTimeout(() => {
        setSkipRender(false);
      }, 0);
      // });
    }
  }, [skipRender]);

  // todo: mid/blocked when offscreen api is available, remove Freeze
  return (
    <RouteProvider
      routeConfig={routeConfig}
      matches={matches}
      initialHistoryState={historyState}
      isFrozen={isFrozen}
      navState={navState}
    >
      <Freeze freeze={isFrozen}>
        {skipRender
          ? null
          : (
            <BatchImagesLoadProvider>
              <RouteRenderer
                Component={Component}
                loading={routeConfig.auth && authState === 'fetching'}
                missingAuth={routeConfig.auth && authState === 'out'}
              />
            </BatchImagesLoadProvider>
          )}
      </Freeze>
    </RouteProvider>
  );
});

/*
After history updates:
Render 1: Animate stacks
  - if first render, skip rendering content
  - if rerendering, render deferred nav state
Render 2: Render current route
Render 3: Render everything else
*/
export default function RouteContainer({
  pendingNavState,
  deferredNavState,
  historyState,
  isFrozen,
  ...props
}: RouteProps & {
  pendingNavState: NavState,
  deferredNavState: NavState,
}) {
  const isFirstRender = useIsFirstRender();
  const isCurState = historyState.key === pendingNavState.curState.key;

  const prevDeferredNavState = usePrevious(deferredNavState);
  const prevIsFrozen = usePrevious(isFrozen);
  if (!process.env.PRODUCTION
    && prevDeferredNavState
    && deferredNavState !== prevDeferredNavState
    && isFrozen
    && !prevIsFrozen) {
    ErrorLogger.error(new Error(`RouteContainer(${historyState.key}): freezing during transition`));
    // eslint-disable-next-line no-console
    console.log(historyState.key, {
      historyState,
      pendingNavState,
      deferredNavState,
      prevDeferredNavState,
    });
  }

  const [navState, setNavState] = useState(pendingNavState);
  useEffect(() => {
    if (!isFirstRender) {
      // React.startTransition(() => {
      setTimeout(() => {
        setNavState(isCurState
          ? pendingNavState
          : deferredNavState);
      }, 0);
      // });
    }
  }, [isFirstRender, isCurState, pendingNavState, deferredNavState]);

  return (
    <Route
      {...props}
      historyState={historyState}
      navState={isFirstRender ? pendingNavState : navState}
      isFrozen={isFrozen}
    />
  );
}
