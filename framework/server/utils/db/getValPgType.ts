import getNonNullSchema from 'utils/models/getNonNullSchema';

const JSON_SCHEMA_TO_POSTGRES_TYPES = {
  string: 'text',
  number: 'double precision',
  integer: 'integer',
  boolean: 'boolean',
};

// This is far from perfect, just a quick hack.
export default function getValDbType<T extends ModelClass>(
  Model: T,
  col: ModelKey<T>,
  val: any,
): string {
  const colSchema = Model.getSchema()[col];
  if (!colSchema) {
    throw new Error(`getValDbType(${Model.name}, ${col}): schema not found`);
  }

  if (colSchema.type === 'string' && colSchema.format === 'date') {
    return 'date';
  }

  if (colSchema.instanceof === 'Date') {
    return 'timestamp';
  }

  const colSchemaType = getNonNullSchema(colSchema).nonNullType;
  if (typeof colSchemaType === 'string') {
    if (colSchemaType === 'integer' && (col === 'id' || col.endsWith('Id'))) {
      return 'bigint';
    }

    const postgresType = TS.getProp(
      JSON_SCHEMA_TO_POSTGRES_TYPES,
      colSchemaType,
    ) as string | undefined;
    if (postgresType) {
      return postgresType;
    }
  }
  if (val instanceof Date) {
    return 'timestamp';
  }

  throw getErr(`getValDbType(${Model.name}, ${col}): unknown type`, { val });
}
