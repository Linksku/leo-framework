import customRoutes from 'config/routes';
import defaultRoutes from 'routes/defaultRoutes';

const allRoutes = [...customRoutes, ...defaultRoutes];
export const allRouteConfigs = allRoutes.map(route => {
  let regexPrefix: string | null = null;
  if (route[0] instanceof RegExp) {
    const matches = route[0].toString().match(/^\/\^\\(\/[\w-]+)/);
    regexPrefix = matches ? matches[1] : null;
  }
  return {
    pattern: route[0],
    importComponent: route[1],
    Component: React.lazy(route[1]),
    regexPrefix,
    ...route[2],
  } as RouteConfig;
});

export type MatchedRoute = {
  routeConfig: RouteConfig | null,
  matches: Stable<string[]>,
};

const MATCHES_CACHE: Map<
  string,
  Stable<MatchedRoute>
> = new Map();

const DEFAULT_RET: Stable<MatchedRoute> = markStable({
  routeConfig: null,
  matches: EMPTY_ARR,
});

function _pathToRouteImpl(path: string): MatchedRoute {
  for (const route of allRouteConfigs) {
    if (route.regexPrefix && !path.startsWith(route.regexPrefix)) {
      continue;
    }

    let matches: string[] | null;
    if (route.pattern instanceof RegExp) {
      matches = path.match(route.pattern)?.slice(1) ?? null;
    } else {
      matches = route.pattern === path ? EMPTY_ARR : null;
    }

    if (matches) {
      return {
        routeConfig: route,
        matches: markStable(matches),
      };
    }
  }

  return DEFAULT_RET;
}

export default function pathToRoute(
  path: Nullish<string>,
): Stable<MatchedRoute> {
  if (!path) {
    return DEFAULT_RET;
  }

  if (MATCHES_CACHE.has(path)) {
    return TS.defined(MATCHES_CACHE.get(path));
  }

  const ret = markStable(_pathToRouteImpl(path));
  MATCHES_CACHE.set(path, ret);
  return ret;
}
