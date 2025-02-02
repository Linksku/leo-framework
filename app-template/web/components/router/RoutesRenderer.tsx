import type { NavState } from 'stores/history/historyStoreTypes';
import pathToRoute from 'core/router/pathToRoute';
import Route from 'core/router/Route';

export default function RoutesRenderer({ pendingNavState, deferredNavState }: {
  pendingNavState: NavState,
  deferredNavState: NavState,
}) {
  const route = pathToRoute(pendingNavState.curState.path);
  return (
    <Route
      routeConfig={route.routeConfig}
      matches={route.matches}
      historyState={pendingNavState.curState}
      pendingNavState={pendingNavState}
      deferredNavState={deferredNavState}
    />
  );
}
