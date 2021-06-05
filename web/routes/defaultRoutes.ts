// todo: low/hard build separate JS files for each route.
const defaultRoutes: RouteConfig[] = [
  // Unauth.
  {
    pattern: '/login',
    Component: React.lazy(async () => import(/* webpackChunkName: 'LoginRoute' */ 'routes/LoginRoute')),
  },
  {
    pattern: '/register',
    Component: React.lazy(async () => import(/* webpackChunkName: 'RegisterRoute' */ 'routes/RegisterRoute')),
  },
  {
    pattern: '/resetpassword',
    Component: React.lazy(async () => import(/* webpackChunkName: 'ResetPasswordRoute' */ 'routes/ResetPasswordRoute')),
  },
  {
    pattern: '/resetpasswordverify',
    Component: React.lazy(async () => import(/* webpackChunkName: 'ResetPasswordVerifyRoute' */ 'routes/ResetPasswordVerifyRoute')),
  },

  // 404.
  {
    pattern: /.*/,
    Component: React.lazy(async () => import(/* webpackChunkName: 'NotFoundRoute' */ 'routes/NotFoundRoute')),
  },
];

export default defaultRoutes;
