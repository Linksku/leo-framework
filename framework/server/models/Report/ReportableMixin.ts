import type { MVWithBTEntityConfig } from 'lib/Model/createMVWithBTEntityClass';
import Report from './Report';

export default function ReportableMixin({ BTClass, type }: Partial<MVWithBTEntityConfig<any>>) {
  if (!type) {
    throw new Error('ReportableMixin: type not defined');
  }
  if (!BTClass) {
    throw new Error('ReportableMixin: BTClass not defined');
  }

  return {
    schema: {
      numReports: { type: 'integer' },
    },
    MVDefaultCols: {
      numReports: 0,
    },
    MVQueryDeps: [Report],
    extendMVQuery: [
      (query: QueryBuilder<Model>) => query
        .coalesce('numReports', 0)
        .leftJoin(
          Report.query()
            .select(Report.cols.entityId)
            .count({ numReports: '*' })
            .where({
              entityType: type,
            })
            .groupBy('entityId')
            .as(Report.tableName),
          Report.cols.entityId,
          BTClass.cols.id,
        ),
    ],
  };
}
