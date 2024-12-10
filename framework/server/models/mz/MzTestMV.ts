import createMaterializedViewClass from 'core/models/createMaterializedViewClass';
import MzTestModel from './MzTestModel';

// For testing if MZ is running properly
export default createMaterializedViewClass(
  {
    type: 'mzTestMV',
    schema: {
      id: SchemaConstants.id,
      version: { type: 'integer' },
    },
    MVQueryDeps: [MzTestModel],
    getMVQuery: () => entityQuery(MzTestModel)
      .select([
        MzTestModel.cols.id,
        MzTestModel.cols.version,
      ]),
  },
);
