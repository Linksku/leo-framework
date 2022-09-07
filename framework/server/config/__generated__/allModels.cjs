const frameworkModels = [
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
