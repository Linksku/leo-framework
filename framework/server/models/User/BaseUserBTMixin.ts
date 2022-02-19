export default function BaseUserBTMixin() {
  return {
    schema: {
      id: SchemaConstants.id,
      version: SchemaConstants.version,
      email: SchemaConstants.email,
      // todo: low/easy change password to string
      password: SchemaConstants.password,
      name: SchemaConstants.name,
      birthday: SchemaConstants.date,
      registerTime: SchemaConstants.timestampDefaultNow,
    },
    uniqueIndexes: ['id', 'email'],
  };
}
