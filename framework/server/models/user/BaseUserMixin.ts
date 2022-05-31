export default function BaseUserMixin() {
  return {
    schema: {
      id: SchemaConstants.id,
      version: SchemaConstants.version,
      email: SchemaConstants.email,
      // todo: low/easy change password to string
      password: SchemaConstants.password,
      name: SchemaConstants.name,
      birthday: SchemaConstants.dateStr,
      registerTime: SchemaConstants.timestampDefaultNow,
    },
    uniqueIndexes: [
      'id',
      'email',
    ],
    normalIndexes: ['cityId'],
    relations: {
      id: {
        'userMeta.userId': {},
        'notif.userId': {
          name: 'notifs',
        },
      },
    },
  };
}
