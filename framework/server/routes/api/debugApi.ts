import { defineApi } from 'services/ApiManager';
import { apiIdToPartial } from 'utils/models/apiModelId';
import isModelType from 'utils/models/isModelType';

defineApi(
  {
    name: 'checkEntityExists',
    paramsSchema: {
      type: 'object',
      required: ['entityType', 'entityId'],
      properties: {
        entityType: { type: 'string' },
        entityId: {
          oneOf: [
            SchemaConstants.id,
            { type: 'string' },
          ],
        },
      },
      additionalProperties: false,
    },
    dataSchema: {
      type: 'object',
      required: ['exists'],
      properties: {
        exists: { type: 'boolean' },
      },
      additionalProperties: false,
    },
  },
  async function checkEntityExistsApi({ entityType, entityId }: ApiHandlerParams<'checkEntityExists'>) {
    if (process.env.PRODUCTION || !isModelType(entityType)) {
      return {
        data: { exists: false },
      };
    }

    const Model = getModelClass(entityType);
    const partial = apiIdToPartial(entityType, entityId);
    const ent = await Model.selectOne(partial);
    return {
      data: {
        exists: !!ent,
      },
    };
  },
);
