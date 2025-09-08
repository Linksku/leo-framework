import getNonNullSchema from 'utils/models/getNonNullSchema';
import isSchemaNullable from 'utils/models/isSchemaNullable';
import pgValToJSType from 'utils/db/pgValToJSType';

function getSchemaTypeError({
  schema,
  colName,
  colType,
  defaultType,
}: {
  schema: JsonSchema,
  colName: string,
  colType: string,
  defaultType: string | undefined,
}) {
  const { nonNullSchema, nonNullType } = getNonNullSchema(schema);

  if (schema.default !== undefined) {
    if (!defaultType || schema.default !== pgValToJSType(defaultType)) {
      // eslint-disable-next-line @typescript-eslint/no-base-to-string
      return `default should be ${schema.default}`;
    }
  } else if (defaultType) {
    return 'shouldn\'t have default';
  }

  if (nonNullType === 'string') {
    if (!['text', 'character varying', 'character', 'date'].includes(colType)) {
      return 'isn\'t string';
    }
    if (colType === 'character varying' && nonNullSchema && !nonNullSchema.enum) {
      if (!nonNullSchema.maxLength) {
        return 'has no max length';
      }
      if (nonNullSchema.maxLength > 255) {
        return 'isn\'t text';
      }
    }
  } else if (nonNullType === 'number') {
    if (!['real', 'double precision'].includes(colType)) {
      return 'isn\'t float';
    }
  } else if (nonNullType === 'integer') {
    if (!['smallint', 'int', 'integer', 'bigint'].includes(colType)) {
      return 'isn\'t integer';
    }
    if ((/^(net|num|min|max|total)[A-Z]/.test(colName) || /[A-Z]Count$/.test(colName))
      && colType === 'bigint') {
      return 'isn\'t smaller int';
    }
    if ((colName === 'id' || colName.endsWith('Id')) && colType !== 'bigint') {
      return 'isn\'t bigint';
    }
    if (schema.maximum && schema.maximum < 2 ** 16 && colType !== 'smallint') {
      return 'isn\'t smallint';
    }
  } else if (nonNullType === 'boolean') {
    if (!['boolean'].includes(colType)) {
      return 'isn\'t boolean';
    }
  } else if (nonNullSchema?.instanceof === 'Date') {
    if (colType === 'timestamp with time zone') {
      // timestamptz becomes string in DBZ, timestamp is int
      return 'shouldn\'t have timezone';
    }
    if (!['timestamp', 'timestamp without time zone', 'date', 'datetime'].includes(colType)) {
      return 'isn\'t date';
    }
  } else if (nonNullType === 'object') {
    if (colType !== 'jsonb' && colType !== 'text') {
      return 'isn\'t json or text';
    }
  } else {
    return 'has unhandled type';
  }
  return null;
}

export default function doesPgTypeMatchSchema({
  Model,
  colName,
  schema,
  colStr,
}: {
  Model: ModelClass,
  colName: string,
  schema: JsonSchema,
  colStr: string,
}): string | null {
  const colNullable = !/\bNOT NULL\b/.test(colStr);
  const schemaNullable = isSchemaNullable(schema);
  if (schemaNullable && !colNullable) {
    return 'isn\'t nullable';
  }
  if (!schemaNullable && colNullable) {
    return 'is nullable';
  }

  // todo: low/med better pg expression parser
  const defaultType = colStr.match(/ DEFAULT ('[^']+'(?:::(?:character varying|double precision|[^ ]+))?|[^ ]+)/)
    ?.[1];
  const colType = colStr.replace(/ [A-Z].*/, '').replace(/\([^)]+\)/, '');
  const { nonNullSchema, nonNullType } = getNonNullSchema(schema);
  if (!nonNullSchema) {
    return 'has unhandleable schema';
  }
  if (Model.jsonAttributes?.includes(colName)) {
    return colType === 'text'
      ? null
      : 'isn\'t json text';
  }
  if (nonNullType === 'array') {
    const schemaItemType = nonNullSchema.items;
    if (!schemaItemType || Array.isArray(schemaItemType)) {
      return 'has no array items type';
    }
    if (!colType.endsWith('[]')) {
      return 'isn\'t array';
    }
    const err = getSchemaTypeError({
      schema: schemaItemType,
      colName,
      colType: colType.slice(0, -2),
      defaultType,
    });
    if (err) {
      return err;
    }

    if (schema.default && defaultType !== '[]') {
      return 'has wrong default';
    }
    return null;
  }
  if (nonNullType) {
    return getSchemaTypeError({
      schema,
      colName,
      colType,
      defaultType,
    });
  }
  if (nonNullSchema.instanceof === 'Date') {
    if (schema.default instanceof Date
      && schema.default.getTime() !== 0) {
      return defaultType === 'CURRENT_TIMESTAMP(6)'
        ? null
        : 'default should be current timestamp';
    }
    if (schema.default instanceof Date
      && schema.default.getTime() === 0) {
      return defaultType === '\'1970-01-01 00:00:00\'::timestamp'
        ? null
        : 'default should be unix 0';
    }
    if (schema.default !== undefined) {
      return !defaultType || pgValToJSType(defaultType) !== schema.default
        // eslint-disable-next-line @typescript-eslint/no-base-to-string
        ? `default should be ${schema.default}`
        : null;
    }
    if (colType !== 'timestamp without time zone') {
      return 'isn\'t timestamp';
    }
    return null;
  }
  return 'has unknown schema';
}
