import pathToRoute from 'utils/pathToRoute';

export default function prefetchRoute(path: string) {
  pathToRoute(path).routeConfig
    ?.importComponent()
    // eslint-disable-next-line unicorn/prefer-top-level-await
    .catch(err => {
      ErrorLogger.warn(err, { ctx: 'prefetchRoute', path });
    });
}
