import createBTEntityClass from 'lib/Model/createBTEntityClass';

export default createBTEntityClass(
  {
    type: 'notifBT',
    tableName: 'notifsBT',
    MVType: 'notif',
    schema: {
      id: SchemaConstants.id,
      version: SchemaConstants.version,
      notifType: { type: 'string' },
      userId: SchemaConstants.id,
      groupingId: SchemaConstants.id,
      time: SchemaConstants.timestampDefaultNow,
      params: SchemaConstants.pojo.withDefault({}),
      hasRead: { type: 'boolean', default: false },
    },
    jsonAttributes: ['params'],
    uniqueIndexes: [
      'id',
      ['notifType', 'userId', 'groupingId'],
    ],
  },
);
