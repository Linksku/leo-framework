export default class UserMeta extends Entity implements IUserMeta {
  static type = 'userMeta' as const;
  static tableName = 'usersMeta' as const;

  static dbJsonSchema = {
    type: 'object',
    required: ['userId', 'metaKey', 'metaValue'],
    properties: {
      id: SchemaConstants.id,
      userId: SchemaConstants.id,
      metaKey: SchemaConstants.type,
      metaValue: { type: 'string' },
    },
    additionalProperties: false,
  };

  static get relationMappings() {
    return {
      user: {
        relation: Model.BelongsToOneRelation,
        // eslint-disable-next-line global-require
        modelClass: require('config/models').default.User,
        join: {
          from: 'usersMeta.userId',
          to: 'users.id',
        },
      },
    };
  }

  type = 'userMeta' as const;
  userId!: number;
  metaKey!: string;
  metaValue!: string;
  user!: BaseUser;
}
