export default [
  [
    '/',
    () => import('routes/HomeRoute'),
  ],
  [
    /.*/i,
    () => import(
      /* webpackChunkName: 'NotFoundRoute' */ 'routes/NotFoundRoute'
    ),
  ],
] as [
  RouteConfig['pattern'],
  (() => Promise<{ default: React.ComponentType<any> | React.NamedExoticComponent<any> }>),
  Omit<
    RouteConfig,
    'pattern' | 'importComponent' | 'getComponent' | 'regexPrefix'
  >?,
][];
