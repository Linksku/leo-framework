import createMVWithBTEntityClass from 'lib/Model/createMVWithBTEntityClass';
import BaseUserMixin from './BaseUserMixin';
import UserBT from './UserBT';

export default createMVWithBTEntityClass(
  {
    type: 'user',
    tableName: 'users',
    BTClass: UserBT,
  },
  BaseUserMixin,
);
