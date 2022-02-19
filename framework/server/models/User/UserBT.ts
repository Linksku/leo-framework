import createBTEntityClass from 'lib/Model/createBTEntityClass';
import BaseUserBTMixin from './BaseUserBTMixin';

export default createBTEntityClass(
  BaseUserBTMixin,
  {
    type: 'userBT',
    tableName: 'usersBT',
    MVType: 'user',
  },
);
