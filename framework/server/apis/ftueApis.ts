import { defineApi } from 'services/ApiManager';

defineApi(
  {
    name: 'ftueSeenTime',
    auth: true,
    paramsSchema: {
      type: 'object',
      required: ['ftueTypes'],
      properties: {
        ftueTypes: {
          type: 'array',
          items: SchemaConstants.dbEnum,
        },
      },
      additionalProperties: false,
    },
  },
  async function ftueSeenTimeApi({
    ftueTypes,
    currentUserId,
  }: ApiHandlerParams<'ftueSeenTime'>) {
    const shownTimes = await FtueSeenTimeModel.selectBulk(ftueTypes.map(type => ({
      userId: currentUserId,
      ftueType: type,
    })));
    return {
      data: null,
      entities: shownTimes,
    };
  },
);

defineApi(
  {
    method: 'post',
    name: 'seenFtue',
    auth: true,
    paramsSchema: {
      type: 'object',
      required: ['ftueType'],
      properties: {
        ftueType: SchemaConstants.dbEnum,
      },
      additionalProperties: false,
    },
  },
  async function seenFtueApi({
    ftueType,
    currentUserId,
  }: ApiHandlerParams<'seenFtue'>) {
    const shownTime = await FtueSeenTimeModel.insertOne({
      userId: currentUserId,
      ftueType,
    }, { onDuplicate: 'update' });
    return {
      data: null,
      createdEntities: [shownTime],
    };
  },
);
