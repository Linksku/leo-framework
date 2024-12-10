const defaultRoutes: [
  RouteConfig['pattern'],
  (() => Promise<{ default: React.ComponentType<any> | React.NamedExoticComponent<any> }>),
  Omit<
    RouteConfig,
    'pattern' | 'importComponent' | 'getComponent' | 'regexPrefix'
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
  [
    '/support',
    () => import(
      /* webpackChunkName: 'SupportRoute' */ 'routes/SupportRoute'
    ),
  ],
  [
    '/verifyemail',
    () => import(
      /* webpackChunkName: 'VerifyEmailRoute' */ 'routes/VerifyEmailRoute'
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

  // Misc.
  [
    '/debug',
    () => import(
      /* webpackChunkName: 'DebugRoute' */ 'routes/DebugRoute'
    ),
  ],

  // 404.
  [
    /.*/i,
    () => import(
      /* webpackChunkName: 'NotFoundRoute' */ 'routes/NotFoundRoute'
    ),
  ],
];

export default defaultRoutes;
