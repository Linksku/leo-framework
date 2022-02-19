import createMVWithBTEntityClass from 'lib/Model/createMVWithBTEntityClass';
import ReportBT from './ReportBT';

export default createMVWithBTEntityClass(
  {
    type: 'report',
    tableName: 'reports',
    BTClass: ReportBT,
    relations: {
      reporter: {
        relation: 'belongsTo',
        model: 'user',
        from: 'reporterId',
        to: 'id',
      },
    },
  },
);
