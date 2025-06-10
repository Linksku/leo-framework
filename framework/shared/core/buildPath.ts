import type RouteParams from 'config/routeQueryParams';
import removeUndefinedValues from 'utils/removeUndefinedValues';

// todo: low/med map route name to path
export default function buildPath<RouteName extends keyof RouteParams = never>(
  path: string,
  params?: Partial<Record<RouteParams[RouteName], string | number>>,
): string {
  if (!params) {
    return path;
  }

  const newParams = removeUndefinedValues(params);
  let newPath = path + (path.includes('?') ? '&' : '?');
  for (const pair of TS.objEntries(newParams)) {
    newPath += `${encodeURIComponent(pair[0])}=${encodeURIComponent(pair[1])}&`;
  }
  return newPath.slice(0, -1);
}
