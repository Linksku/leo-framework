export default class Report extends Entity implements IReport {
  static type = 'report' as const;
  static tableName = 'reports' as const;

  static jsonSchema = {
    type: 'object',
    required: ['reporterId', 'entityType', 'entityId'],
    properties: {
      id: SchemaConstants.id,
      reporterId: SchemaConstants.id,
      entityType: SchemaConstants.name,
      entityId: SchemaConstants.id,
      time: SchemaConstants.datetimeDefaultNow,
    },
    additionalProperties: false,
  };

  static get relationMappings() {
    return {
      reporter: {
        relation: Model.BelongsToOneRelation,
        // eslint-disable-next-line global-require
        modelClass: require('config/userModel').default,
        join: {
          from: 'reports.reporterId',
          to: 'users.id',
        },
      },
    };
  }

  type = 'report' as const;
  reporterId!: number;
  entityType!: string;
  entityId!: number;
  time!: Date;
  reporter!: User;
}
