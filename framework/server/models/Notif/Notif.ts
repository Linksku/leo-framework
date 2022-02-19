import createMVWithBTEntityClass from 'lib/Model/createMVWithBTEntityClass';
import NotifBT from './NotifBT';

export default createMVWithBTEntityClass(
  {
    type: 'notif',
    tableName: 'notifs',
    BTClass: NotifBT,
  },
);
