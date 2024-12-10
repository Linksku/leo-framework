import { JSONSchema4TypeName } from 'json-schema';

export default function getNonNullSchema(schema: JsonSchema): {
  nonNullSchema: JsonSchema,
  nonNullType: JSONSchema4TypeName | null,
} {
  const combined = schema.anyOf ?? schema.oneOf ?? schema.allOf;
  const nonNullSchema = combined
    ? TS.defined(combined.find(s => s.type !== 'null'))
    : schema;
  const nonNullType = nonNullSchema?.type
    ? (Array.isArray(nonNullSchema.type)
      ? TS.defined(nonNullSchema.type.find(t => t !== 'null'))
      : nonNullSchema.type)
    : (typeof nonNullSchema === 'string' ? nonNullSchema : null);
  return {
    nonNullSchema,
    nonNullType,
  };
}
