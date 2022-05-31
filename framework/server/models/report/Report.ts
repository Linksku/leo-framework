import createEntityClass from 'services/model/createEntityClass';

export default createEntityClass(
  {
    type: 'report',
    schema: {
      id: SchemaConstants.id,
      version: SchemaConstants.version,
      reporterId: SchemaConstants.id,
      entityType: {
        type: 'string',
        enum: ['post'],
      },
      entityId: SchemaConstants.id,
      time: SchemaConstants.timestampDefaultNow,
    },
    uniqueIndexes: [
      'id',
      ['reporterId', 'entityType', 'entityId'],
    ],
    relations: {
      reporterId: {
        'user.id': {
          name: 'reporter',
        },
      },
    },
  },
);
