export default function isSchemaNullable(schema: JSONSchema) {
  return (Array.isArray(schema.type) && schema.type.includes('null'))
    || (Array.isArray(schema.anyOf) && schema.anyOf.some(t => t.type === 'null'));
}
