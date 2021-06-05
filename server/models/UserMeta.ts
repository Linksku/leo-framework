export default class UserMeta extends Entity {
  static type = 'userMeta' as const;
  static tableName = 'usersMeta' as const;

  static jsonSchema = {
    type: 'object',
    required: ['userId', 'metaKey'],
    properties: {
      id: SchemaConstants.id,
      userId: SchemaConstants.id,
      metaKey: SchemaConstants.name,
      metaValue: { type: 'string' },
    },
    additionalProperties: false,
  };

  static get relationMappings() {
    return {
      user: {
        relation: Model.BelongsToOneRelation,
        // eslint-disable-next-line global-require
        modelClass: require('../../src/server/config/userModel').default,
        join: {
          from: 'usersMeta.userId',
          to: 'users.id',
        },
      },
    };
  }

  userId!: number;
  metaKey!: string;
  metaValue!: string;
  user!: User;
}
