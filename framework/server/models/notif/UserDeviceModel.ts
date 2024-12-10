import createEntityClass from 'core/models/createEntityClass';

export default createEntityClass(
  {
    type: 'userDevice',
    deleteable: true,
    schema: {
      id: SchemaConstants.id,
      userId: SchemaConstants.id,
      platform: SchemaConstants.dbEnum,
      deviceId: { ...SchemaConstants.content, maxLength: 255 },
      lastSeenTime: SchemaConstants.timestampDefaultNow,
      userAgent: SchemaConstants.content.orNull(),
      registrationToken: { ...SchemaConstants.content.orNull(), maxLength: 255 },
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
