import createInputMaterializedViewClass from 'services/model/createInputMaterializedViewClass';
import Report from './Report';

export default createInputMaterializedViewClass(
  {
    type: 'reportsCountMV',
    replicaTable: null,
    schema: {
      entityType: {
        type: 'string',
        enum: ['post'],
      },
      entityId: SchemaConstants.id,
      count: SchemaConstants.nonNegInt,
    },
    uniqueIndexes: [
      ['entityType', 'entityId'],
    ],
    BTClass: Report,
    MVQuery: modelQuery(Report)
      .select([
        Report.cols.entityType,
        Report.cols.entityId,
      ])
      .count({ count: '*' })
      .groupBy([
        Report.cols.entityType,
        Report.cols.entityId,
      ]),
  },
);
