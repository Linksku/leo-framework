const id = TS.literal({ type: 'integer', minimum: 1 } as const);
const idArr = TS.literal({ type: 'array', items: id } as const);
const url = TS.literal({ type: 'string', format: 'url', maxLength: 255 } as const);
const datetime = TS.literal({
  instanceof: 'Date',
  // todo: low/mid extend JsonSchema with custom props
  tsType: 'Date',
} as const);
const cursor = TS.literal({ type: 'string', minLength: 1 } as const);

const SchemaConstants = TS.literal({
  // Core.
  id,
  idArr,
  limit: { type: 'integer', minimum: 1, maximum: 30 },
  cursor,

  // Standard.
  dateStr: {
    type: 'string',
    format: 'date',
  },
  date: datetime,
  datetime,
  datetimeDefaultMin: {
    ...datetime,
    // 1000-01-01 00:00:00
    default: new Date(1000, 0, 1),
  },
  datetimeDefaultNow: datetime,
  email: { type: 'string', format: 'email', maxLength: 255 },
  file: {
    type: 'object',
    properties: {},
    tsType: 'Express.Multer.File',
  },
  jsonArr: { type: 'string', minLength: 2, default: '[]' },
  jsonObj: { type: 'string', minLength: 2, default: '{}' },
  lat: { type: 'number', minimum: -90, maximum: 90 },
  lng: { type: 'number', minimum: -180, maximum: 180 },
  nonNegInt: { type: 'integer', minimum: 0 },
  pojo: {
    type: 'object',
    properties: {},
    tsType: 'JsonObj',
  },
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
  url,

  // Framework-specific.
  content: { type: 'string', minLength: 1, maxLength: 2048 },
  name: { type: 'string', minLength: 1, maxLength: 50 },
  pagination: {
    type: 'object',
    required: ['items', 'hasCompleted'],
    properties: {
      items: {
        type: 'array',
        items: {
          anyOf: [
            { type: 'number' },
            { type: 'string' },
          ],
        },
      },
      cursor,
      hasCompleted: { type: 'boolean' },
    },
    additionalProperties: false,
  },
  entitiesPagination: {
    type: 'object',
    required: ['items', 'hasCompleted'],
    properties: {
      items: idArr,
      cursor,
      hasCompleted: { type: 'boolean' },
    },
    additionalProperties: false,
  },
  password: { type: 'string', minLength: 8, maxLength: 64 },
  type: { type: 'string', minLength: 1, maxLength: 30 },
} as const);

type SchemaConstantsType = typeof SchemaConstants;

for (const val of Object.values(SchemaConstants)) {
  if (TS.hasProp(val, 'orNull')) {
    continue;
  }

  Object.defineProperties(val, {
    orNull: {
      value(this: JsonSchema) {
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
      value(this: JsonSchema, defaultVal: any) {
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
