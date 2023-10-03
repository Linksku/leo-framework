const frameworkModels: any[] = [
  {
    type: 'mzTest',
    path: 'framework/server/models/mz/MzTest.ts',
    Model: require('../../models/mz/MzTest').default,
    isRR: true,
  },
  {
    type: 'mzTestMV',
    path: 'framework/server/models/mz/MzTestMV.ts',
    Model: require('../../models/mz/MzTestMV').default,
    isRR: true,
  },
  {
    type: 'user',
    path: 'framework/server/models/user/User.ts',
    Model: require('../../models/user/User').default,
    isRR: true,
  },
  {
    type: 'userAuth',
    path: 'framework/server/models/user/UserAuth.ts',
    Model: require('../../models/user/UserAuth').default,
    isRR: true,
  },
  {
    type: 'userDevice',
    path: 'framework/server/models/user/UserDevice.ts',
    Model: require('../../models/user/UserDevice').default,
    isRR: true,
  },
  {
    type: 'userMeta',
    path: 'framework/server/models/user/UserMeta.ts',
    Model: require('../../models/user/UserMeta').default,
    isRR: true,
  },
];

const appModels: any[] = [
];

export { frameworkModels, appModels };
