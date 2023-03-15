export default function isSchemaNumeric(_schema: JsonSchema) {
  const schema = _schema.anyOf && _schema.anyOf.length === 2
    && _schema.anyOf.filter(s => s.type === 'null').length === 1
    ? TS.defined(_schema.anyOf.find(s => s.type !== 'null'))
    : _schema;

  let type: string | undefined;
  if (typeof schema.type === 'string') {
    type = schema.type;
  } else if (Array.isArray(schema.type) && schema.type.length === 2
    && schema.type.filter(t => t === 'null').length === 1) {
    type = TS.defined(schema.type.find(t => t !== 'null'));
  }

  return type === 'number' || type === 'integer';
}
