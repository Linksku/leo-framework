const id = { type: 'integer', minimum: 1 };
const idArr = { type: 'array', items: id };

export default {
  content: { type: 'string', minLength: 1 },
  json: { type: 'string', minLength: 2 },
  date: { type: 'string', format: 'date' },
  datetime: { type: 'string', format: 'mysql-date-time' },
  email: { type: 'string', format: 'email' },
  id,
  idArr,
  lat: { type: 'number', minimum: -90, maximum: 90 },
  limit: { type: 'integer', minimum: 1, maximum: 30 },
  lng: { type: 'number', minimum: -180, maximum: 180 },
  name: { type: 'string', minLength: 1 },
  nonNegInt: { type: 'integer', minimum: 0 },
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
};
