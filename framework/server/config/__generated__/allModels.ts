const frameworkModels: any[] = [
  {
    type: 'ftueSeenTime',
    path: 'framework/server/models/FtueSeenTimeModel.ts',
    Model: require('../../models/FtueSeenTimeModel').default,
    isRR: true,
  },
  {
    type: 'mzTest',
    path: 'framework/server/models/mz/MzTestModel.ts',
    Model: require('../../models/mz/MzTestModel').default,
    isRR: true,
  },
  {
    type: 'mzTestMV',
    path: 'framework/server/models/mz/MzTestMV.ts',
    Model: require('../../models/mz/MzTestMV').default,
    isRR: true,
  },
  {
    type: 'notif',
    path: 'framework/server/models/notif/NotifModel.ts',
    Model: require('../../models/notif/NotifModel').default,
    isRR: true,
  },
  {
    type: 'notifSetting',
    path: 'framework/server/models/notif/NotifSettingModel.ts',
    Model: require('../../models/notif/NotifSettingModel').default,
    isRR: true,
  },
  {
    type: 'unsubEmail',
    path: 'framework/server/models/notif/UnsubEmailModel.ts',
    Model: require('../../models/notif/UnsubEmailModel').default,
    isRR: true,
  },
  {
    type: 'unsubNotif',
    path: 'framework/server/models/notif/UnsubNotifModel.ts',
    Model: require('../../models/notif/UnsubNotifModel').default,
    isRR: true,
  },
  {
    type: 'user',
    path: 'framework/server/models/user/UserModel.ts',
    Model: require('../../models/user/UserModel').default,
    isRR: true,
  },
  {
    type: 'userAuth',
    path: 'framework/server/models/user/UserAuthModel.ts',
    Model: require('../../models/user/UserAuthModel').default,
    isRR: true,
  },
  {
    type: 'userDevice',
    path: 'framework/server/models/notif/UserDeviceModel.ts',
    Model: require('../../models/notif/UserDeviceModel').default,
    isRR: true,
  },
  {
    type: 'userMeta',
    path: 'framework/server/models/user/UserMetaModel.ts',
    Model: require('../../models/user/UserMetaModel').default,
    isRR: true,
  },
  {
    type: 'virtualRenderedNotif',
    path: 'framework/server/models/notif/VirtualRenderedNotif.ts',
    Model: require('../../models/notif/VirtualRenderedNotif').default,
    isRR: true,
  },
];

const appModels: any[] = [
];

export { frameworkModels, appModels };
