import { defineApi } from 'services/ApiManager';

// todo: high/veryhard increase moderation privileges based on club reputation
defineApi(
  {
    method: 'post',
    name: 'report',
    auth: true,
    paramsSchema: {
      type: 'object',
      required: ['entityType', 'entityId'],
      properties: {
        entityType: {
          type: 'string',
          enum: ['post'],
        },
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
      report = await Report.findOne({ id: reportId });
    }
    return {
      createdEntities: [report],
      data: null,
    };
  },
);
