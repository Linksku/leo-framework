import createEntityClass from 'services/model/createEntityClass';
import BaseUserMixin from './BaseUserMixin';

export default createEntityClass(
  BaseUserMixin,
  {
    type: 'user',
  },
);
