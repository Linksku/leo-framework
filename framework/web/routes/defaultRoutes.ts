const defaultRoutes: [
  RouteConfig['pattern'],
  (() => Promise<{ default: React.ComponentType<any> | React.NamedExoticComponent<any> }>),
  Omit<
    RouteConfig,
    'pattern' | 'importComponent' | 'Component' | 'regexPrefix'
  >?,
][] = [
  // Unauth.
  [
    '/login',
    () => import(
      /* webpackChunkName: 'LoginRoute' */ 'routes/LoginRoute'
    ),
  ],
  [
    '/register',
    () => import(
      /* webpackChunkName: 'RegisterRoute' */ 'routes/RegisterRoute'
    ),
  ],
  [
    '/resetpassword',
    () => import(
      /* webpackChunkName: 'ResetPasswordRoute' */ 'routes/ResetPasswordRoute'
    ),
  ],
  [
    '/resetpasswordverify',
    () => import(
      /* webpackChunkName: 'ResetPasswordVerifyRoute' */ 'routes/ResetPasswordVerifyRoute'
    ),
  ],

  // TOS.
  [
    '/tos/privacy',
    () => import(
      /* webpackChunkName: 'PrivacyPolicyRoute' */ 'routes/tos/PrivacyPolicyRoute'
    ),
  ],
  [
    '/tos/terms',
    () => import(
      /* webpackChunkName: 'TermsOfServiceRoute' */ 'routes/tos/TermsOfServiceRoute'
    ),
  ],
  [
    '/tos/cookie',
    () => import(
      /* webpackChunkName: 'CookiePolicyRoute' */ 'routes/tos/CookiePolicyRoute'
    ),
  ],

  // 404.
  [
    /.*/,
    () => import(
      /* webpackChunkName: 'NotFoundRoute' */ 'routes/NotFoundRoute'
    ),
  ],
];

export default defaultRoutes;
