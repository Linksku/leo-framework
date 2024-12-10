import createEntityClass from 'core/models/createEntityClass';
import BaseUserMixin from './BaseUserMixin';

export default createEntityClass(
  BaseUserMixin,
  {
    type: 'user',
  },
);
