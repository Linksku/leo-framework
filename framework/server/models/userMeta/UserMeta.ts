import createEntityClass from 'services/model/createEntityClass';

export default createEntityClass(
  {
    type: 'userMeta',
    schema: {
      id: SchemaConstants.id,
      version: SchemaConstants.version,
      userId: SchemaConstants.id,
      metaKey: SchemaConstants.type,
      metaValue: { type: 'string' },
    },
    uniqueIndexes: [
      'id',
      ['userId', 'metaKey'],
    ],
    relations: {
      userId: {
        'user.id': {},
      },
    },
  },
);
