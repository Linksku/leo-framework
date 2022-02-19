import createBTEntityClass from 'lib/Model/createBTEntityClass';

export default createBTEntityClass(
  {
    type: 'reportBT',
    tableName: 'reportsBT',
    MVType: 'report',
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
  },
);
