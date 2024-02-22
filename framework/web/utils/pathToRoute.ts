import customRoutes from 'config/routes';
import defaultRoutes from 'routes/defaultRoutes';

const allRoutes = [...customRoutes, ...defaultRoutes];
export const allRouteConfigs = allRoutes.map(route => {
  let regexPrefix: string | null = null;
  if (route[0] instanceof RegExp) {
    const matches = route[0].toString().match(/^\/\^\\(\/[\w-]+)/);
    regexPrefix = matches ? matches[1] : null;
  } else if (!process.env.PRODUCTION && route[0] !== route[0].toLowerCase()) {
    ErrorLogger.warn(new Error(`pathToRoute: "${route[0]}" isn't lowercase`));
  }

  let Component: React.ComponentType<any> | null = null;
  return {
    pattern: route[0],
    importComponent: route[1],
    getComponent() {
      if (!Component) {
        // React.lazy stores network errors permanently
        Component = React.lazy(() => route[1]()
          .catch(err => {
            Component = null;
            throw err;
          }));
      }
      return Component;
    },
    regexPrefix,
    ...route[2],
  } as RouteConfig;
});

export type MatchedRoute = {
  path: string,
  routeConfig: RouteConfig,
  matches: Stable<string[]>,
};

const MATCHES_CACHE = new Map<
  string,
  Stable<MatchedRoute> | null
>();

function _pathToRouteImpl(path: string): MatchedRoute | null {
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
      while (matches.length && matches.at(-1) === undefined) {
        matches.pop();
      }
      return {
        path,
        routeConfig: route,
        matches: markStable(matches),
      };
    }
  }

  return null;
}

export default function pathToRoute(
  path: Nullish<string>,
): Stable<MatchedRoute> | null {
  if (path == null) {
    return null;
  }
  if (!process.env.PRODUCTION && path === '') {
    ErrorLogger.warn(new Error('pathToRoute: empty path'));
  }

  path = path.toLowerCase();
  if (path !== '/' && path.endsWith('/')) {
    path = path.slice(0, -1);
  }
  if (MATCHES_CACHE.has(path)) {
    return TS.defined(MATCHES_CACHE.get(path));
  }

  const ret = markStable(_pathToRouteImpl(path));
  MATCHES_CACHE.set(path, ret);
  return ret;
}
