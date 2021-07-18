import Notif from 'models/Notif';
import Report from 'models/Report';
import UserMeta from 'models/UserMeta';
import srcModels from 'config/models';

export default {
  Notif,
  Report,
  UserMeta,
  ...srcModels,
};
