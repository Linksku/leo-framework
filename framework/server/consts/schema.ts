const id = TS.literal({ type: 'integer', minimum: 1 } as const);
const idArr = TS.literal({ type: 'array', items: id } as const);
const url = TS.literal({ type: 'string', format: 'url', maxLength: 255 } as const);
const datetime = {
  instanceof: 'Date',
  tsType: 'Date',
  // todo: low/mid extend JSONSchema with custom props
} as JSONSchema;
const cursor = TS.literal({ type: 'string', minLength: 1 } as const);

const SchemaConstants = TS.literal({
  content: { type: 'string', minLength: 1, maxLength: 2048 },
  stringDefaultEmpty: { type: 'string', default: '' },
  jsonObj: { type: 'string', minLength: 2, default: '{}' },
  jsonArr: { type: 'string', minLength: 2, default: '[]' },
  timestamp: datetime,
  timestampDefaultNow: {
    ...datetime,
    // Not sure if this will cause issues.
    default: new Date(),
  },
  timestampDefaultZero: {
    ...datetime,
    default: new Date(0),
  },
  date: {
    type: 'string',
    format: 'date',
  },
  datetime,
  datetimeDefaultNow: datetime,
  datetimeDefaultMin: {
    ...datetime,
    // 1000-01-01 00:00:00
    default: new Date(1000, 0, 1),
  },
  email: { type: 'string', format: 'email', maxLength: 255 },
  id,
  idArr,
  version: { type: 'integer', default: 0 },
  limit: { type: 'integer', minimum: 1, maximum: 30 },
  cursor,
  lat: { type: 'number', minimum: -90, maximum: 90 },
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
    type: 'object',
    required: ['entityIds', 'hasCompleted'],
    properties: {
      entityIds: idArr,
      cursor,
      hasCompleted: { type: 'boolean' },
    },
    additionalProperties: false,
  },
  pojo: {
    type: 'object',
    properties: {},
    tsType: 'Pojo',
  },
  file: {
    type: 'object',
    properties: {},
    tsType: 'Express.Multer.File',
  },
} as const);

type SchemaConstantsType = typeof SchemaConstants;

for (const val of Object.values(SchemaConstants)) {
  // @ts-ignore type might be overridden
  if (val.orNull) {
    continue;
  }

  Object.defineProperties(val, {
    orNull: {
      value(this: JSONSchema) {
        if (this.type) {
          return {
            ...this,
            type: Array.isArray(this.type) ? [...this.type, 'null'] : [this.type, 'null'],
            // @ts-ignore tsType
            ...(this.tsType ? { tsType: `${this.tsType} | null` } : null),
          };
        }
        return {
          anyOf: [
            this,
            { type: 'null' },
          ],
          // @ts-ignore tsType
          ...(this.tsType ? { tsType: `${this.tsType} | null` } : null),
        };
      },
      writable: false,
      enumerable: false,
    },
    withDefault: {
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

// For simpler types when debugging.
type SchemaConstant<K extends keyof SchemaConstantsType> = SchemaConstantsType[K] & {
  orNull: () => SchemaConstant<K>,
  withDefault: (defaultVal: any) => SchemaConstant<K>,
};

export default SchemaConstants as unknown as {
  [K in keyof SchemaConstantsType]: SchemaConstant<K>;
};
