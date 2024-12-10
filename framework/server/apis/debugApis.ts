import omit from 'lodash/omit.js';

import { INIT_INFRA_REDIS_KEY } from 'consts/infra';
import { defineApi } from 'services/ApiManager';
import { getFailingHealthchecks } from 'services/healthcheck/HealthcheckManager';
import { redisMaster } from 'services/redis';
import getServerId from 'utils/getServerId';
import { apiIdToPartial } from 'utils/models/apiModelId';
import isModelType from 'utils/models/isModelType';
import getAuthResponse, { getUserDataSchema } from 'apis/helpers/getAuthResponse';
import checkUserRole from 'core/checkUserRole';

defineApi(
  {
    name: 'healthchecks',
    paramsSchema: SchemaConstants.emptyObj,
    dataSchema: {
      type: 'object',
      required: ['serverId', 'failingHealthchecks'],
      properties: {
        serverId: SchemaConstants.nonNegInt,
        failingHealthchecks: SchemaConstants.nameArr,
        isInitInfra: { type: 'boolean' },
      },
      additionalProperties: false,
    },
  },
  async function healthchecksApi() {
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
        entityType: SchemaConstants.modelType,
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
    if (Model.isVirtual
      || !entries.length
      || entries.some((_, v) => v === undefined)) {
      return {
        data: { exists: false },
      };
    }

    const ent = await Model.selectOne(partial);
    return {
      data: {
        exists: !!ent && !TS.getProp(ent, 'isDeleted'),
      },
    };
  },
);

defineApi(
  {
    method: 'post',
    name: 'loginAsUser',
    auth: true,
    paramsSchema: {
      type: 'object',
      required: ['userId'],
      properties: {
        userId: SchemaConstants.id,
      },
      additionalProperties: false,
    },
    dataSchema: getUserDataSchema(),
  },
  async function loginAsUserApi({
    userId,
    currentUserId,
  }: ApiHandlerParams<'loginAsUser'>) {
    const { currentUser, user } = await promiseObj({
      currentUser: UserModel.selectOne({ id: currentUserId }),
      user: UserModel.selectOne({ id: userId }),
    });
    if (!currentUser || !checkUserRole(currentUser, 'ENGINEER')) {
      throw new UserFacingError('Couldn\'t login as user', 403);
    }
    if (!user) {
      throw new UserFacingError('Can\'t find user', 404);
    }
    if (checkUserRole(user, 'ADMIN')) {
      throw new UserFacingError('Can\'t login as admin', 403);
    }

    return getAuthResponse(userId);
  },
);
