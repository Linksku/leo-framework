const frameworkModels = [
  {
    type: 'mzTest',
    path: 'framework/server/models/mz/MzTest.ts',
    // Model: require('../../models/mz/MzTest').default,
    replicaTable: 'mzTest',
  },
  {
    type: 'mzTestMV',
    path: 'framework/server/models/mz/MzTestMV.ts',
    // Model: require('../../models/mz/MzTestMV').default,
    replicaTable: 'mzTestMV',
  },
  {
    type: 'notif',
    path: 'framework/server/models/notif/Notif.ts',
    // Model: require('../../models/notif/Notif').default,
    replicaTable: 'notif',
  },
  {
    type: 'user',
    path: 'framework/server/models/user/User.ts',
    // Model: require('../../models/user/User').default,
    replicaTable: 'user',
  },
  {
    type: 'userAuth',
    path: 'framework/server/models/user/UserAuth.ts',
    // Model: require('../../models/user/UserAuth').default,
    replicaTable: 'userAuth',
  },
  {
    type: 'userMeta',
    path: 'framework/server/models/userMeta/UserMeta.ts',
    // Model: require('../../models/userMeta/UserMeta').default,
    replicaTable: 'userMeta',
  },
];

const appModels = [
];

module.exports = {
  frameworkModels,
  appModels,
};
