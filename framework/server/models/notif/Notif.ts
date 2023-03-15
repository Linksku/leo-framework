import createEntityClass from 'services/model/createEntityClass';

export default createEntityClass(
  {
    type: 'notif',
    schema: {
      id: SchemaConstants.id,
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
    normalIndexes: [
      ['userId', 'time'],
    ],
  },
);
