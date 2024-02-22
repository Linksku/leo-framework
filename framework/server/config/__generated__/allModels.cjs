const frameworkModels = [
  {
    type: 'mzTest',
    path: 'framework/server/models/mz/MzTestModel.ts',
    // Model: require('../../models/mz/MzTestModel').default,
    isRR: true,
  },
  {
    type: 'mzTestMV',
    path: 'framework/server/models/mz/MzTestMV.ts',
    // Model: require('../../models/mz/MzTestMV').default,
    isRR: true,
  },
  {
    type: 'notif',
    path: 'framework/server/models/notif/NotifModel.ts',
    // Model: require('../../models/notif/NotifModel').default,
    isRR: true,
  },
  {
    type: 'unsubNotif',
    path: 'framework/server/models/notif/UnsubNotifModel.ts',
    // Model: require('../../models/notif/UnsubNotifModel').default,
    isRR: true,
  },
  {
    type: 'user',
    path: 'framework/server/models/user/UserModel.ts',
    // Model: require('../../models/user/UserModel').default,
    isRR: true,
  },
  {
    type: 'userAuth',
    path: 'framework/server/models/user/UserAuthModel.ts',
    // Model: require('../../models/user/UserAuthModel').default,
    isRR: true,
  },
  {
    type: 'userDevice',
    path: 'framework/server/models/notif/UserDeviceModel.ts',
    // Model: require('../../models/notif/UserDeviceModel').default,
    isRR: true,
  },
  {
    type: 'userMeta',
    path: 'framework/server/models/user/UserMetaModel.ts',
    // Model: require('../../models/user/UserMetaModel').default,
    isRR: true,
  },
  {
    type: 'virtualRenderedNotif',
    path: 'framework/server/models/notif/VirtualRenderedNotif.ts',
    // Model: require('../../models/notif/VirtualRenderedNotif').default,
    isRR: true,
  },
];

const appModels = [
];

module.exports = {
  frameworkModels,
  appModels,
};
