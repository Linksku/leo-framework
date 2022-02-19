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
    let report = await Report.selectOne({
      reporterId: currentUserId,
      entityType,
      entityId,
    });

    if (!report) {
      report = await Report.insertBTReturningMVEntity({
        reporterId: currentUserId,
        entityType,
        entityId,
      }, {
        waitForMVInserted: false,
      });
    }
    return {
      createdEntities: [report],
      data: null,
    };
  },
);
