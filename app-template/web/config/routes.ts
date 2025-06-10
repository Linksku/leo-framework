import HomeRoute from 'routes/HomeRoute';

export default [
  // Auth
  [
    '/login',
    () => import(
      /* webpackChunkName: 'LoginRoute' */ 'routes/auth/LoginRoute'
    ),
  ],
  [
    '/register',
    () => import(
      /* webpackChunkName: 'RegisterRoute' */ 'routes/auth/RegisterRoute'
    ),
  ],
  [
    '/resetpassword',
    () => import(
      /* webpackChunkName: 'ResetPasswordRoute' */ 'routes/auth/ResetPasswordRoute'
    ),
  ],
  [
    '/resetpasswordverify',
    () => import(
      /* webpackChunkName: 'ResetPasswordVerifyRoute' */ 'routes/auth/ResetPasswordVerifyRoute'
    ),
  ],
  [
    '/support',
    () => import(
      /* webpackChunkName: 'SupportRoute' */ 'routes/auth/SupportRoute'
    ),
  ],
  [
    '/verifyemail',
    () => import(
      /* webpackChunkName: 'VerifyEmailRoute' */ 'routes/auth/VerifyEmailRoute'
    ),
  ],

  // Main
  [
    '/',
    () => Promise.resolve({ default: HomeRoute }),
  ],
  [
    '/addtohomescreen',
    () => import(
      /* webpackChunkName: 'AddToHomeScreenRoute' */ 'routes/AddToHomeScreenRoute'
    ),
  ],
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
  [
    '/unsub',
    () => import(
      /* webpackChunkName: 'UnsubEmailRoute' */ 'routes/UnsubEmailRoute'
    ),
  ],

  // Misc
  [
    '/debug',
    () => import(
      /* webpackChunkName: 'DebugRoute' */ 'routes/DebugRoute'
    ),
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
