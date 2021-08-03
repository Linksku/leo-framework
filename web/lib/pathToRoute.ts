import customRoutes from 'config/routes';
import defaultRoutes from 'routes/defaultRoutes';

const MATCHES_CACHE: Map<string | RegExp, Map<string, string[] | null>> = new Map();
export default function pathToRoute(
  path: Nullish<string>,
): (RouteConfig & { matches: string[] }) | StrictlyEmptyObj {
  if (path) {
    for (const route of [...customRoutes, ...defaultRoutes]) {
      const { pattern } = route;
      if (!MATCHES_CACHE.has(pattern)) {
        MATCHES_CACHE.set(pattern, new Map());
      }

      const patternMatches = MATCHES_CACHE.get(pattern) as Map<string, string[] | null>;
      if (!patternMatches.has(path)) {
        if (pattern instanceof RegExp) {
          patternMatches.set(path, path.match(pattern)?.slice(1) ?? null);
        } else {
          patternMatches.set(path, pattern === path ? [] : null);
        }
      }
      const matches = patternMatches.get(path);

      if (matches) {
        return {
          ...route,
          matches,
        };
      }
    }
  }

  return {};
}
