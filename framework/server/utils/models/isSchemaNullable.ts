export default function isSchemaNullable(schema: JsonSchema) {
  return (Array.isArray(schema.type) && schema.type.includes('null'))
    || (Array.isArray(schema.anyOf) && schema.anyOf.some(t => t.type === 'null'));
}
