export default function BaseUserMixin() {
  return {
    schema: {
      id: SchemaConstants.id,
      email: SchemaConstants.email,
      name: SchemaConstants.name,
      birthday: SchemaConstants.dateStr,
    },
    uniqueIndexes: [
      'id',
      'email',
    ],
    relations: {
      id: {
        'userMeta.userId': {},
        'userAuth.userId': {},
      },
    },
  };
}
