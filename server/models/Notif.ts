export default class Notif extends Entity implements INotif {
  static type = 'notif' as const;
  static tableName = 'notifs' as const;

  static dbJsonSchema = {
    type: 'object',
    required: ['notifType', 'userId', 'groupingId'],
    properties: {
      id: SchemaConstants.id,
      notifType: { type: 'string' },
      userId: SchemaConstants.id,
      groupingId: SchemaConstants.id,
      time: SchemaConstants.datetimeDefaultNow,
      params: SchemaConstants.pojo.default({}),
      hasRead: { type: 'boolean', default: false },
    },
    additionalProperties: false,
  };

  static get jsonAttributes() {
    return ['params'];
  }

  protected static uniqueProperties = new Set(['id']);

  type = 'notif' as const;
  notifType!: string;
  userId!: number;
  groupingId!: number;
  time!: Date;
  params!: ObjectOf<any>;
  hasRead!: boolean;
}
