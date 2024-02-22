import createEntityClass from 'services/model/createEntityClass';

export default createEntityClass(
  {
    type: 'userDevice',
    deleteable: true,
    schema: {
      id: SchemaConstants.id,
      userId: SchemaConstants.id,
      platform: SchemaConstants.dbEnum,
      deviceId: SchemaConstants.content,
      lastSeenTime: SchemaConstants.timestampDefaultNow,
      userAgent: SchemaConstants.content.orNull(),
      registrationToken: SchemaConstants.content.orNull(),
    },
    uniqueIndexes: [
      'id',
      ['userId', 'deviceId'],
    ],
    relations: {
      userId: {
        'user.id': {},
      },
    },
  },
);
