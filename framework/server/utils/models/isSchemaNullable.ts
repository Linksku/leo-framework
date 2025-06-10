export default function isSchemaNullable(schema: JsonSchema) {
  return (Array.isArray(schema.type) && schema.type.includes('null'))
    || (Array.isArray(schema.enum) && schema.enum.includes(null))
    || (Array.isArray(schema.anyOf)
      && schema.anyOf.some(
        t => t.type === 'null'
          || t.const === null
          || (Array.isArray(t.enum) && t.enum.includes(null))))
    || (Array.isArray(schema.oneOf)
      && schema.oneOf.some(
        t => t.type === 'null'
          || t.const === null
          || (Array.isArray(t.enum) && t.enum.includes(null))));
}
