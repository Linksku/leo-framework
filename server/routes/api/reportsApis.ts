import { defineApi } from 'services/ApiManager';

defineApi(
  {
    method: 'post',
    name: 'report',
    auth: true,
    paramsSchema: {
      type: 'object',
      required: ['entityType', 'entityId'],
      properties: {
        entityType: SchemaConstants.name,
        entityId: SchemaConstants.id,
      },
      additionalProperties: false,
    },
  },
  async function createReport({ entityType, entityId, currentUserId }) {
    let report: Report | null = await Report.query()
      .findOne({
        reporterId: currentUserId,
        entityType,
        entityId,
      });

    if (!report) {
      const reportId = await Report.insert({
        reporterId: currentUserId,
        entityType,
        entityId,
      });
      report = await Report.findOne('id', reportId);
    }
    return {
      entities: [report],
      data: null,
    };
  },
);
