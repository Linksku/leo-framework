const JSON_SCHEMA_TO_POSTGRES_TYPES = {
  string: 'text',
  number: 'double precision',
  integer: 'bigint',
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

  if (colSchema.instanceOf === 'Date') {
    return 'timestamp';
  }

  let colSchemaType = colSchema.type;
  if (Array.isArray(colSchemaType) && colSchemaType.length === 2 && colSchemaType.includes('null')) {
    colSchemaType = colSchemaType[0];
  }
  if (colSchemaType && !Array.isArray(colSchemaType)) {
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

  throw new ErrorWithCtx(`getValDbType(${Model.name}, ${col}): unknown type`, `val = ${val}`);
}
