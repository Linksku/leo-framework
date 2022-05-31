import type { MaterializedViewConfig } from 'services/model/createMaterializedViewClass';
import Report from './Report';

export default function ReportableMixin({ reportType, parentClass }: {
  reportType: EntityType,
  parentClass: EntityClass,
}) {
  return (_: Partial<MaterializedViewConfig<any>>) => ({
    schema: {
      numReports: { type: 'integer' },
    },
    MVQueryDeps: [Report],
    extendMVQuery: [
      (query: QueryBuilder<Model>) => query
        .coalesce('numReports', 0)
        .leftJoin(
          modelQuery(Report)
            .select(Report.cols.entityId)
            .count({ numReports: '*' })
            .where({
              [Report.cols.entityType]: reportType,
            })
            .groupBy(Report.cols.entityId)
            .as(Report.tableName),
          Report.cols.entityId,
          parentClass.cols.id,
        ),
    ],
  });
}
