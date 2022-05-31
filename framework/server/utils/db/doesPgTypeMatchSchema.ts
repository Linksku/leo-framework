import isSchemaNullable from 'utils/models/isSchemaNullable';

// todo: low/easy handle schema checks better, e.g. low maximum -> smallint
export default function doesPgTypeMatchSchema(col: string, schema: JSONSchema, _colType: string) {
  const colNullable = !/\bNOT NULL\b/.test(_colType);
  const schemaNullable = isSchemaNullable(schema);
  if (schemaNullable && !colNullable) {
    return 'isn\'t nullable';
  }
  if (!schemaNullable && colNullable) {
    return 'is nullable';
  }

  const colType = _colType.replace(/ [A-Z].*/, '').replace(/\([^)]+\)/, '');
  const nonNullSchema = schema.anyOf
    ? schema.anyOf.find(s => s.type !== 'null')
    : schema;
  if (!nonNullSchema) {
    return 'has unhandleable schema';
  }
  const schemaType = nonNullSchema.type
    ? (Array.isArray(nonNullSchema.type) ? nonNullSchema.type.find(t => t !== 'null') : nonNullSchema.type)
    : nonNullSchema;

  if (schemaType === 'string') {
    if (!['text', 'character varying', 'character', 'date'].includes(colType)) {
      return 'isn\'t string';
    }
  } else if (schemaType === 'number') {
    if (!['real', 'double precision'].includes(colType)) {
      return 'isn\'t number';
    }
  } else if (schemaType === 'integer') {
    if (!['smallint', 'int', 'integer', 'bigint'].includes(colType)) {
      return 'isn\'t integer';
    }
    if (/^(net|num)[A-Z]/.test(col) && colType === 'bigint') {
      return 'isn\'t smaller int';
    }
  } else if (schemaType === 'boolean') {
    if (!['boolean'].includes(colType)) {
      return 'isn\'t boolean';
    }
  } else if (nonNullSchema.instanceof === 'Date') {
    if (colType === 'timestamp without time zone') {
      return 'is missing timezone';
    }
    if (!['timestamp', 'timestamp with time zone', 'date', 'datetime'].includes(colType)) {
      return 'isn\'t date';
    }
  } else if (schemaType === 'array' || schemaType === 'object') {
    // pass
  } else {
    return 'has unhandled type';
  }

  return null;
}
