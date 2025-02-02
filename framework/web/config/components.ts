import { NavState } from 'stores/history/historyStoreTypes';

export function RoutesRenderer(_props: {
  pendingNavState: NavState,
  deferredNavState: NavState,
  isNavigating: boolean,
}) {
  return null;
}

export function RouteRenderer(_props: {
  Component?: React.ComponentType<any>,
  loading?: boolean,
  missingAuth?: boolean,
  err?: string,
}) {
  return null;
}
