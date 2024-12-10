export default function BaseUserMixin() {
  return {
    schema: {
      id: SchemaConstants.id,
      isDeleted: { type: 'boolean', default: false },
      role: { type: 'integer', default: 0 },
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
