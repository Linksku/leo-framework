import createMVWithBTEntityClass from 'lib/Model/createMVWithBTEntityClass';
import UserMetaBT from './UserMetaBT';

export default createMVWithBTEntityClass(
  {
    type: 'userMeta',
    tableName: 'userMeta',
    BTClass: UserMetaBT,
    relations: {
      user: {
        relation: 'belongsTo',
        model: 'user',
        from: 'userId',
        to: 'id',
      },
    },
  },
);
