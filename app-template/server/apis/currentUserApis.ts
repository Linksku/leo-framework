import { defineApi } from 'services/ApiManager';

defineApi(
  {
    name: 'currentUser',
    auth: true,
    paramsSchema: SchemaConstants.emptyObj,
    dataSchema: {
      type: 'object',
      required: ['currentUserId'],
      properties: {
        currentUserId: SchemaConstants.id,
      },
      additionalProperties: false,
    },
  },
  async function currentUserApi({ currentUserId }: ApiHandlerParams<'currentUser'>) {
    const user = await UserModel.selectOne({ id: currentUserId });
    if (!user) {
      throw new UserFacingError('User not found', 404);
    }

    return {
      entities: [user],
      data: {
        currentUserId: user.id,
      },
    };
  },
);
