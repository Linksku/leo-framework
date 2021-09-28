const id = { type: 'integer', minimum: 1 };
const idArr = { type: 'array', items: id };
const url = { type: 'string', format: 'url', maxLength: 255 };
const cursor = { type: 'string', minLength: 1 };

const SchemaConstants = {
  content: { type: 'string', minLength: 1, maxLength: 2048 },
  stringDefaultEmpty: { type: 'string', default: '' },
  jsonObj: { type: 'string', minLength: 2, default: '{}' },
  jsonArr: { type: 'string', minLength: 2, default: '[]' },
  date: {
    type: 'string',
    format: 'date',
  },
  datetime: {
    type: 'string',
    format: 'mysql-date-time',
    tsType: 'Date',
  },
  datetimeDefaultNow: {
    // Null is removed when building types
    type: ['string', 'null'],
    format: 'mysql-date-time',
    tsType: 'Date',
  },
  datetimeDefaultMin: {
    type: 'string',
    format: 'mysql-date-time',
    tsType: 'Date',
    default: '1000-01-01 00:00:00',
  },
  email: { type: 'string', format: 'email', maxLength: 255 },
  id,
  idArr,
  lat: { type: 'number', minimum: -90, maximum: 90 },
  limit: { type: 'integer', minimum: 1, maximum: 30 },
  cursor,
  lng: { type: 'number', minimum: -180, maximum: 180 },
  name: { type: 'string', minLength: 1, maxLength: 50 },
  nameDefaultEmpty: { type: 'string', minLength: 0, maxLength: 50, default: '' },
  type: { type: 'string', minLength: 1, maxLength: 30 },
  nonNegInt: { type: 'integer', minimum: 0 },
  password: { type: 'string', minLength: 8, maxLength: 64 },
  url,
  urlOrEmpty: {
    anyOf: [
      url,
      { enum: [''], default: '' },
    ],
  },
  pagination: {
    type: 'object' as const,
    required: ['entityIds', 'hasCompleted'],
    properties: {
      entityIds: idArr,
      cursor,
      hasCompleted: { type: 'boolean' },
    },
    additionalProperties: false as const,
  },
  pojo: {
    type: 'object',
    properties: {},
    tsType: 'Pojo',
  },
} as const;

type SchemaConstantsType = Mutable<typeof SchemaConstants>;

for (const val of Object.values(SchemaConstants)) {
  Object.defineProperties(val, {
    orNull: {
      // eslint-disable-next-line no-loop-func
      value(this: JSONSchema) {
        const newSchema = {
          ...this,
          type: Array.isArray(this.type) ? [...this.type, 'null'] : [this.type, 'null'],
          // @ts-ignore tsType should be added to JSONSchema
          ...(this.tsType ? { tsType: `${this.tsType} | null` } : null),
        };
        return newSchema;
      },
      writable: false,
      enumerable: false,
    },
    default: {
      // eslint-disable-next-line no-loop-func
      value(this: JSONSchema, defaultVal: any) {
        return {
          ...this,
          default: defaultVal,
        };
      },
      writable: false,
      enumerable: false,
    },
  });
}

export default SchemaConstants as {
  [k in keyof SchemaConstantsType]: SchemaConstantsType[k] & {
    orNull: () => SchemaConstantsType[k],
    default: (defaultVal: any) => SchemaConstantsType[k],
  };
};
