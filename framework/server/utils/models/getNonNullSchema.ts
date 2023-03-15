export default function getNonNullSchema(schema: JsonSchema) {
  const nonNullSchema = schema.anyOf
    ? schema.anyOf.find(s => s.type !== 'null')
    : schema;
  const nonNullType = nonNullSchema?.type
    ? (Array.isArray(nonNullSchema.type) ? nonNullSchema.type.find(t => t !== 'null') : nonNullSchema.type)
    : nonNullSchema;
  return {
    nonNullSchema,
    nonNullType,
  };
}
