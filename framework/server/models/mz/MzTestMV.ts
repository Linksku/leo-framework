import createMaterializedViewClass from 'services/model/createMaterializedViewClass';
import MzTestModel from './MzTestModel';

// For testing if MZ is running properly
export default createMaterializedViewClass(
  {
    type: 'mzTestMV',
    schema: {
      id: SchemaConstants.id,
      version: { type: 'integer', default: 0 },
    },
    MVQueryDeps: [MzTestModel],
    getMVQuery: () => modelQuery(MzTestModel)
      .select([
        MzTestModel.cols.id,
        MzTestModel.cols.version,
      ]),
  },
);
