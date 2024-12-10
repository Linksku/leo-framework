import createEntityClass from 'core/models/createEntityClass';

export default createEntityClass(
  {
    type: 'unsubEmail',
    deleteable: true,
    schema: {
      id: SchemaConstants.id,
      email: SchemaConstants.email,
      time: SchemaConstants.timestampDefaultNow,
    },
    uniqueIndexes: [
      'id',
      'email',
    ],
  },
);
