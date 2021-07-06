import type { JSONSchema } from 'objection';

const id = { type: 'integer', minimum: 1 };
const idArr = { type: 'array', items: id };

const SchemaConstants = {
  content: { type: 'string', minLength: 1 },
  contentDefaultEmpty: { type: 'string', minLength: 1, default: '' },
  json: { type: 'string', minLength: 2 },
  date: { type: 'string', format: 'date' },
  datetime: { type: 'string', format: 'mysql-date-time' },
  datetimeDefaultNow: {
    // Null is removed when building types
    type: ['string', 'null'],
    format: 'mysql-date-time',
  },
  email: { type: 'string', format: 'email' },
  id,
  idArr,
  lat: { type: 'number', minimum: -90, maximum: 90 },
  limit: { type: 'integer', minimum: 1, maximum: 30 },
  lng: { type: 'number', minimum: -180, maximum: 180 },
  name: { type: 'string', minLength: 1 },
  nameDefaultEmpty: { type: 'string', minLength: 1, default: '' },
  nonNegInt: { type: 'integer', minimum: 0 },
  nonNegIntDefault0: { type: 'integer', minimum: 0, default: 0 },
  password: { type: 'string', minLength: 8, maxLength: 64 },
  url: { type: 'string', format: 'url' },
  pagination: {
    type: 'object' as const,
    required: ['entityIds', 'hasCompleted'],
    properties: {
      entityIds: idArr,
      cursor: id,
      hasCompleted: { type: 'boolean' },
    },
    additionalProperties: false as const,
  },
} as const;

type SchemaConstantsType = Mutable<typeof SchemaConstants>;

for (const val of Object.values(SchemaConstants)) {
  Object.defineProperty(val, 'orNull', {
    value(this: JSONSchema) {
      return {
        ...this,
        type: Array.isArray(this.type) ? [...this.type, 'null'] : [this.type, 'null'],
      };
    },
    writable: false,
    enumerable: false,
  });
}

export default SchemaConstants as {
  [k in keyof SchemaConstantsType]: SchemaConstantsType[k] & {
    orNull: () => SchemaConstantsType[k],
  };
};
