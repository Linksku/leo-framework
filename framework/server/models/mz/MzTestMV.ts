import createInputMaterializedViewClass from 'services/model/createInputMaterializedViewClass';
import MzTest from './MzTest';

// For testing if MZ is running properly
export default createInputMaterializedViewClass(
  {
    type: 'mzTestMV',
    schema: {
      id: SchemaConstants.id,
      version: { type: 'integer', default: 0 },
    },
    BTClass: MzTest,
    getMVQuery: () => modelQuery(MzTest)
      .select([
        MzTest.cols.id,
        MzTest.cols.version,
      ]),
  },
);
