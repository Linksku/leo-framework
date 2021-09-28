import type { QueryContext } from 'objection';

export default class BaseUser extends Entity {
  static type = 'user' as const;
  static tableName = 'users' as const;

  static dbJsonSchema = {
    type: 'object',
    required: ['email', 'password', 'name', 'birthday'],
    properties: {
      id: SchemaConstants.id,
      email: SchemaConstants.email,
      // todo: low/easy change password to string
      password: SchemaConstants.password,
      name: SchemaConstants.name,
      birthday: SchemaConstants.date,
      registerTime: SchemaConstants.datetimeDefaultNow,
    },
    additionalProperties: false,
  };

  protected static uniqueProperties = new Set(['id', 'email']);

  type = 'user' as const;
  email!: string;
  password!: string;
  name!: string;
  birthday!: string;
  registerTime!: Date;

  async $beforeInsert(ctx: QueryContext) {
    await super.$beforeInsert(ctx);

    this.email = this.email.toLowerCase();
  }

  async $beforeUpdate(_opts: any, ctx: QueryContext) {
    await super.$beforeUpdate(_opts, ctx);

    if (this.email) {
      this.email = this.email.toLowerCase();
    }
  }

  $formatApiJson(obj: SerializedEntity): SerializedEntity {
    // todo: high/mid conditionally hide email
    delete obj.password;
    return obj;
  }
}
