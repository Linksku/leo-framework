import createEntityClass from 'core/models/createEntityClass';

// For testing if MZ is running properly
export default createEntityClass(
  {
    type: 'mzTest',
    schema: {
      id: SchemaConstants.id,
      version: { type: 'integer', default: 0 },
    },
  },
);
