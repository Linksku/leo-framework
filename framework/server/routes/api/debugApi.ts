import { INIT_INFRA_REDIS_KEY } from 'consts/infra';
import { defineApi } from 'services/ApiManager';
import { getFailingHealthchecks } from 'services/healthcheck/HealthcheckManager';
import { redisMaster } from 'services/redis';
import getServerId from 'utils/getServerId';
import { apiIdToPartial } from 'utils/models/apiModelId';
import isModelType from 'utils/models/isModelType';

defineApi(
  {
    name: 'status',
    paramsSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
    dataSchema: {
      type: 'object',
      required: ['serverId', 'failingHealthchecks'],
      properties: {
        serverId: SchemaConstants.nonNegInt,
        failingHealthchecks: {
          type: 'array',
          items: SchemaConstants.name,
        },
        isInitInfra: { type: 'boolean' },
      },
      additionalProperties: false,
    },
  },
  async function statusApi() {
    const isInitInfra = !!await redisMaster.exists(INIT_INFRA_REDIS_KEY);
    return {
      data: {
        serverId: getServerId(),
        failingHealthchecks: getFailingHealthchecks(),
        ...(isInitInfra && { isInitInfra }),
      },
    };
  },
);

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
    const ent = await Model.selectOne(
      // @ts-ignore partial type
      partial,
    );
    return {
      data: {
        exists: !!ent,
      },
    };
  },
);
