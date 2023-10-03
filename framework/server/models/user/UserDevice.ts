import createEntityClass from 'services/model/createEntityClass';

export default createEntityClass(
  {
    type: 'userDevice',
    deleteable: true,
    schema: {
      id: SchemaConstants.id,
      userId: SchemaConstants.id,
      platform: {
        type: 'string',
        enum: ['web', 'android', 'ios'],
      },
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
