// todo: low/hard build separate JS files for each route.
const defaultRoutes = [
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

  // TOS.
  {
    pattern: '/tos/privacy',
    Component: React.lazy(async () => import(/* webpackChunkName: 'PrivacyPolicyRoute' */ 'routes/tos/PrivacyPolicyRoute')),
  },
  {
    pattern: '/tos/terms',
    Component: React.lazy(async () => import(/* webpackChunkName: 'TermsOfServiceRoute' */ 'routes/tos/TermsOfServiceRoute')),
  },
  {
    pattern: '/tos/cookie',
    Component: React.lazy(async () => import(/* webpackChunkName: 'CookiePolicyRoute' */ 'routes/tos/CookiePolicyRoute')),
  },

  // 404.
  {
    pattern: /.*/,
    Component: React.lazy(async () => import(/* webpackChunkName: 'NotFoundRoute' */ 'routes/NotFoundRoute')),
  },
];

export default defaultRoutes as Memoed<MemoObjShallow<
  (typeof defaultRoutes)[number]
>>[] as RouteConfig[];
