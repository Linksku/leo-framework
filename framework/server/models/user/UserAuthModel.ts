import createEntityClass from 'core/models/createEntityClass';

export default createEntityClass(
  {
    type: 'userAuth',
    schema: {
      id: SchemaConstants.id,
      userId: SchemaConstants.id,
      isDeleted: { type: 'boolean', default: false },
      password: SchemaConstants.password.orNull(),
      registerTime: SchemaConstants.timestampDefaultNow,
      isEmailVerified: { type: 'boolean', default: false },
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
