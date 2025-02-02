import createEntityClass from 'core/models/createEntityClass';
import BaseUserMixin from 'models/user/BaseUserMixin';

export default createEntityClass(
  BaseUserMixin,
  {
    type: 'user',
    schema: {},
    relations: {},
  },
);
