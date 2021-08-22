import type { QueryContext } from 'objection';
import bcrypt from 'bcrypt';

export default class BaseUser extends Entity {
  static type = 'user' as const;
  static tableName = 'users' as const;

  static dbJsonSchema = {
    type: 'object',
    required: ['email', 'password', 'name', 'birthday'],
    properties: {
      id: SchemaConstants.id,
      email: SchemaConstants.email,
      password: SchemaConstants.password,
      name: SchemaConstants.name,
      birthday: SchemaConstants.date,
    },
    additionalProperties: false,
  };

  protected static uniqueProperties = new Set(['id', 'email']);

  type = 'user' as const;
  birthday!: Date;
  email!: string;
  password!: string;
  name!: string;

  async $beforeInsert(ctx: QueryContext) {
    await super.$beforeInsert(ctx);

    const salt = await bcrypt.genSalt();
    this.password = await bcrypt.hash(`${this.password}${process.env.PASSWORD_PEPPER}`, salt);

    this.email = this.email.toLowerCase();
  }

  async $beforeUpdate(_opts: any, ctx: QueryContext) {
    await super.$beforeUpdate(_opts, ctx);

    if (this.password) {
      const salt = await bcrypt.genSalt();
      this.password = await bcrypt.hash(`${this.password}${process.env.PASSWORD_PEPPER}`, salt);
    }

    if (this.email) {
      this.email = this.email.toLowerCase();
    }
  }

  $formatJson(json: ObjectOf<any>): ObjectOf<any> {
    json = super.$formatJson(json);
    // todo: high/mid conditionally hide email
    delete json.password;
    return json;
  }
}
