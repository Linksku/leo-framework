import pathToRoute from 'core/router/pathToRoute';

export default function prefetchRoute(path: string) {
  pathToRoute(path)
    ?.routeConfig
    .importComponent()
    .catch(err => {
      ErrorLogger.warn(err, { ctx: 'prefetchRoute', path });
    });
}
