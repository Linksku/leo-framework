import createEntityClass from 'services/model/createEntityClass';
import BaseUserMixin from 'models/user/BaseUserMixin';

export default createEntityClass(
  BaseUserMixin,
  {
    type: 'user',
    schema: {},
    relations: {},
  },
);
