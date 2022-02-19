import createBTEntityClass from 'lib/Model/createBTEntityClass';

export default createBTEntityClass(
  {
    type: 'userMetaBT',
    tableName: 'userMetaBT',
    MVType: 'userMeta',
    schema: {
      id: SchemaConstants.id,
      version: SchemaConstants.version,
      userId: SchemaConstants.id,
      metaKey: SchemaConstants.type,
      metaValue: { type: 'string' },
    },
    uniqueIndexes: ['id', ['userId', 'metaKey']],
  },
);
