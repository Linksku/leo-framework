import createEntityClass from 'services/model/createEntityClass';

export default createEntityClass(
  {
    type: 'userMeta',
    deleteable: true,
    schema: {
      id: SchemaConstants.id,
      userId: SchemaConstants.id,
      metaKey: SchemaConstants.type,
      metaValue: { type: 'string' },
    },
    skipColumnsForMZ: [
      'metaValue',
    ],
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
