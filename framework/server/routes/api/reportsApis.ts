import { defineApi } from 'services/ApiManager';

// todo: high/veryhard increase moderation privileges based on club reputation
defineApi(
  {
    method: 'post',
    name: 'createReport',
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
  async function createReportApi({ entityType, entityId, currentUserId }: ApiHandlerParams<'createReport'>) {
    let report = await Report.selectOne({
      reporterId: currentUserId,
      entityType,
      entityId,
    });

    if (!report) {
      report = await Report.insert({
        reporterId: currentUserId,
        entityType,
        entityId,
      });
    }
    return {
      createdEntities: [report],
      data: null,
    };
  },
);
