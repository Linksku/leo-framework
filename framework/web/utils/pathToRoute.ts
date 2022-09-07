import customRoutes from 'config/routes';
import defaultRoutes from 'routes/defaultRoutes';

type PathToMatches = Map<string, string[] | null>;

const MATCHES_CACHE: Map<
  string | RegExp,
  PathToMatches
> = new Map();

export default function pathToRoute(
  path: Nullish<string>,
): {
  routeConfig: RouteConfig | null,
  matches: Memoed<string[]>,
} {
  if (path) {
    for (const route of [...customRoutes, ...defaultRoutes]) {
      const { pattern } = route;
      const pathToMatches: PathToMatches = MATCHES_CACHE.get(pattern) ?? new Map();
      if (!MATCHES_CACHE.has(pattern)) {
        MATCHES_CACHE.set(pattern, pathToMatches);
      }

      if (!pathToMatches.has(path)) {
        if (pattern instanceof RegExp) {
          pathToMatches.set(path, path.match(pattern)?.slice(1) ?? null);
        } else {
          pathToMatches.set(path, pattern === path ? [] : null);
        }
      }
      const matches = pathToMatches.get(path);

      if (matches) {
        return {
          routeConfig: route,
          matches: markMemoed(matches),
        };
      }
    }
  }

  return {
    routeConfig: null,
    matches: EMPTY_ARR,
  };
}
