const frameworkModels: any[] = [
  {
    type: 'notif',
    path: 'framework/server/models/notif/Notif.ts',
    Model: require('../../models/notif/Notif').default,
    replicaTable: 'notif',
  },
  {
    type: 'report',
    path: 'framework/server/models/report/Report.ts',
    Model: require('../../models/report/Report').default,
    replicaTable: 'report',
  },
  {
    type: 'reportsCountMV',
    path: 'framework/server/models/report/ReportsCountMV.ts',
    Model: require('../../models/report/ReportsCountMV').default,
    replicaTable: null,
  },
  {
    type: 'user',
    path: 'framework/server/models/user/User.ts',
    Model: require('../../models/user/User').default,
    replicaTable: 'user',
  },
  {
    type: 'userMeta',
    path: 'framework/server/models/userMeta/UserMeta.ts',
    Model: require('../../models/userMeta/UserMeta').default,
    replicaTable: 'userMeta',
  },
];

const appModels: any[] = [
];

export { frameworkModels, appModels };
