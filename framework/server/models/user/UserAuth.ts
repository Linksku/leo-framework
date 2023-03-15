import createEntityClass from 'services/model/createEntityClass';

export default createEntityClass(
  {
    type: 'userAuth',
    schema: {
      id: SchemaConstants.id,
      userId: SchemaConstants.id,
      password: SchemaConstants.password,
      registerTime: SchemaConstants.timestampDefaultNow,
    },
    uniqueIndexes: [
      'id',
      'userId',
    ],
    relations: {
      userId: {
        'user.id': {},
      },
    },
  },
);
