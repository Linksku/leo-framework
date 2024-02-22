import omit from 'lodash/omit.js';

import { INIT_INFRA_REDIS_KEY } from 'consts/infra';
import { defineApi } from 'services/ApiManager';
import { getFailingHealthchecks } from 'services/healthcheck/HealthcheckManager';
import { redisMaster } from 'services/redis';
import getServerId from 'core/getServerId';
import { apiIdToPartial } from 'utils/models/apiModelId';
import isModelType from 'utils/models/isModelType';

defineApi(
  {
    name: 'status',
    paramsSchema: SchemaConstants.emptyObj,
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
      required: ['entityType', 'entityPartial'],
      properties: {
        entityType: SchemaConstants.dbEnum,
        entityPartial: {
          type: 'object',
          patternProperties: {
            '^.*$': {
              oneOf: [
                SchemaConstants.id,
                { type: 'string' },
                { type: 'null' },
              ],
            },
          },
          // @ts-ignore tsType
          tsType: 'ObjectOf<string | number | null>',
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
  async function checkEntityExistsApi({
    entityType,
    entityPartial,
  }: ApiHandlerParams<'checkEntityExists'>) {
    if (process.env.PRODUCTION || !isModelType(entityType)) {
      return {
        data: { exists: false },
      };
    }

    const Model = getModelClass(entityType);
    const partial = entityPartial.id
      ? {
        ...omit(entityPartial, 'id'),
        ...apiIdToPartial(entityType, entityPartial.id),
      }
      : entityPartial;
    const entries = Object.entries(entityPartial);
    if (!entries.length
      || entries.some((_, v) => v === undefined)) {
      return {
        data: { exists: false },
      };
    }

    const ent = await Model.selectOne(
      // @ts-ignore partial type
      partial,
    );
    return {
      data: {
        exists: !!ent && !TS.getProp(ent, 'isDeleted'),
      },
    };
  },
);
