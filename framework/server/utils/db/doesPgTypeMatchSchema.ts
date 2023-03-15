import getNonNullSchema from 'utils/models/getNonNullSchema';
import isSchemaNullable from 'utils/models/isSchemaNullable';

function getSchemaTypeError({ schema, colName, colType }: {
  schema: JsonSchema,
  colName: string,
  colType: string,
}) {
  const { nonNullSchema, nonNullType } = getNonNullSchema(schema);

  if (nonNullType === 'string') {
    if (!['text', 'character varying', 'character', 'date'].includes(colType)) {
      return 'isn\'t string';
    }
  } else if (nonNullType === 'number') {
    if (!['real', 'double precision'].includes(colType)) {
      return 'isn\'t number';
    }
  } else if (nonNullType === 'integer') {
    if (!['smallint', 'int', 'integer', 'bigint'].includes(colType)) {
      return 'isn\'t integer';
    }
    if (/^(net|num)[A-Z]/.test(colName) && colType === 'bigint') {
      return 'isn\'t smaller int';
    }
  } else if (nonNullType === 'boolean') {
    if (!['boolean'].includes(colType)) {
      return 'isn\'t boolean';
    }
  } else if (nonNullSchema?.instanceof === 'Date') {
    if (colType === 'timestamp without time zone') {
      return 'is missing timezone';
    }
    if (!['timestamp', 'timestamp with time zone', 'date', 'datetime'].includes(colType)) {
      return 'isn\'t date';
    }
  } else {
    return 'has unhandled type';
  }
  return null;
}

// todo: low/easy handle schema checks better, e.g. low maximum -> smallint
export default function doesPgTypeMatchSchema({
  Model,
  colName,
  schema,
  colType: _colType,
}: {
  Model: ModelClass,
  colName: string,
  schema: JsonSchema,
  colType: string,
}): string | null {
  const colNullable = !/\bNOT NULL\b/.test(_colType);
  const schemaNullable = isSchemaNullable(schema);
  if (schemaNullable && !colNullable) {
    return 'isn\'t nullable';
  }
  if (!schemaNullable && colNullable) {
    return 'is nullable';
  }

  const colType = _colType.replace(/ [A-Z].*/, '').replace(/\([^)]+\)/, '');
  const { nonNullSchema, nonNullType } = getNonNullSchema(schema);
  if (!nonNullSchema) {
    return 'has unhandleable schema';
  }

  if (Model.jsonAttributes?.includes(colName)) {
    if (colType !== 'text') {
      return 'isn\'t json text';
    }
  } else if (nonNullType === 'array') {
    const schemaItemType = nonNullSchema.items;
    if (!schemaItemType || Array.isArray(schemaItemType)) {
      return 'has no array items type';
    }
    if (!colType.endsWith('[]')) {
      return 'isn\'t array';
    }
    return getSchemaTypeError({
      schema: schemaItemType,
      colName,
      colType: colType.slice(0, -2),
    });
  } else if (nonNullType === 'object') {
    // temp
    return null;
  } else if (nonNullType) {
    return getSchemaTypeError({
      schema,
      colName,
      colType,
    });
  } else {
    return 'has unknown schema';
  }
  return null;
}
