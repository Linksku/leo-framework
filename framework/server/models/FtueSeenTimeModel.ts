import createEntityClass from 'core/models/createEntityClass';

export default createEntityClass(
  {
    type: 'ftueSeenTime',
    deleteable: true,
    schema: {
      id: SchemaConstants.id,
      userId: SchemaConstants.id,
      ftueType: SchemaConstants.dbEnum,
      time: SchemaConstants.timestampDefaultNow,
    },
    uniqueIndexes: [
      'id',
      ['userId', 'ftueType'],
    ],
    relations: {
      userId: {
        'user.id': {},
      },
    },
  },
);
