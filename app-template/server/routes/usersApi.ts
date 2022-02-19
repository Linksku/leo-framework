import { defineApi } from 'services/ApiManager';


defineApi(
  {
    name: 'currentUser',
    auth: true,
    paramsSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
    dataSchema: {
      type: 'object',
      required: ['currentUserId'],
      properties: {
        currentUserId: SchemaConstants.id,
      },
      additionalProperties: false,
    },
  },
  async function getCurrentUser({ currentUserId }) {
    const user = await User.findOne('id', currentUserId);

    return {
      entities: [user],
      data: {
        currentUserId: user.id,
      },
    };
  },
);
