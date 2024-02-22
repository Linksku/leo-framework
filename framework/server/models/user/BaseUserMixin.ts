export default function BaseUserMixin() {
  return {
    schema: {
      id: SchemaConstants.id,
      isDeleted: { type: 'boolean', default: false },
      email: SchemaConstants.email,
      name: SchemaConstants.name,
      birthday: SchemaConstants.dateStr.orNull(),
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
