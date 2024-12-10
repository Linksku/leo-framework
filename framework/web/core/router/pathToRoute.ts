import customRoutes from 'config/routes';
import defaultRoutes from 'routes/defaultRoutes';

const allRoutes = [...customRoutes, ...defaultRoutes];
export const allRouteConfigs = allRoutes.map(route => {
  let regexPrefix: string | null = null;
  if (route[0] instanceof RegExp) {
    if (!process.env.PRODUCTION && !route[0].flags.includes('i')) {
      ErrorLogger.warn(new Error(`pathToRoute: "${route[0]}" isn't case-insensitive`));
    }

    const matches = route[0].toString().match(/^\/\^\\(\/[\w-]+)/);
    regexPrefix = matches ? matches[1].toLowerCase() : null;
  } else if (!process.env.PRODUCTION && route[0] !== route[0].toLowerCase()) {
    ErrorLogger.warn(new Error(`pathToRoute: "${route[0]}" isn't lowercase`));
  }

  let Component: React.ComponentType<any> | null = null;
  return {
    pattern: route[0],
    importComponent: route[1],
    getComponent() {
      if (!Component) {
        Component = reactLazy(
          () => route[1]()
            .catch(err => {
              setTimeout(() => {
                // React.lazy stores network errors permanently
                Component = null;
              }, 60 * 1000);
              throw err;
            }),
        );
      }
      return Component;
    },
    regexPrefix,
    ...route[2],
  } as RouteConfig;
});

export type MatchedRoute = {
  routeConfig: RouteConfig,
  matches: Stable<string[]>,
};

const MATCHES_CACHE = new Map<
  string,
  Stable<MatchedRoute>
>();

function _pathToRouteImpl(path: string): MatchedRoute {
  const pathLower = path.toLowerCase();
  for (const route of allRouteConfigs) {
    if (!(route.pattern instanceof RegExp)) {
      if (route.pattern === pathLower) {
        return {
          routeConfig: route,
          matches: EMPTY_ARR,
        };
      }
      continue;
    }

    if (route.regexPrefix && !pathLower.startsWith(route.regexPrefix)) {
      continue;
    }

    const matches = path.match(route.pattern)?.slice(1);
    if (matches) {
      while (matches.length && matches.at(-1) === undefined) {
        matches.pop();
      }
      return {
        routeConfig: route,
        matches: markStable(matches),
      };
    }
  }

  // Should always match 404 route
  throw new Error('Route not found');
}

export default function pathToRoute(
  path: string,
): Stable<MatchedRoute> {
  if (!process.env.PRODUCTION && path === '') {
    ErrorLogger.warn(new Error('pathToRoute: empty path'));
  }

  // Shouldn't happen, but just in case
  if (path == null) {
    path = '/notfound';
  }

  if (path !== '/' && path.endsWith('/')) {
    path = path.slice(0, -1);
  }
  if (MATCHES_CACHE.has(path)) {
    return MATCHES_CACHE.get(path) as Stable<MatchedRoute>;
  }

  const ret = markStable(_pathToRouteImpl(path));
  MATCHES_CACHE.set(path, ret);
  return ret;
}
