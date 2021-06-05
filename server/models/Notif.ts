export default class Notif extends Entity {
  static type = 'notif' as const;
  static tableName = 'notifs' as const;

  static jsonSchema = {
    type: 'object',
    required: ['type', 'userId'],
    properties: {
      id: SchemaConstants.id,
      notifType: { type: 'string' },
      userId: SchemaConstants.id,
      groupingId: SchemaConstants.id,
      time: SchemaConstants.datetime,
      params: { type: 'object', properties: {} },
      hasRead: { type: 'boolean' },
    },
    additionalProperties: false,
  };

  static get jsonAttributes() {
    return ['params'];
  }

  static uniqueProperties = new Set(['id']);

  notifType!: string;
  userId!: number;
  groupingId!: number;
  time!: Date | InstanceType<typeof dayjs.Dayjs>;
  params!: ObjectOf<any>;
  hasRead!: boolean;
}
