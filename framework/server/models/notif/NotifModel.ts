import createEntityClass from 'core/models/createEntityClass';
import { NOTIF_SCOPES_ARR } from 'config/notifs';

export default createEntityClass(
  {
    type: 'notif',
    deleteable: true,
    schema: {
      id: SchemaConstants.id,
      scope: {
        type: 'string',
        enum: NOTIF_SCOPES_ARR,
        tsType: 'NotifScope',
      },
      notifType: SchemaConstants.dbEnum,
      userId: SchemaConstants.id,
      groupingId: SchemaConstants.id,
      time: SchemaConstants.timestampDefaultNow,
      params: SchemaConstants.pojo.withDefault({}),
      hasRead: { type: 'boolean', default: false },
    },
    jsonAttributes: ['params'],
    uniqueIndexes: [
      'id',
      ['notifType', 'userId', 'groupingId'],
    ],
    normalIndexes: [
      ['userId', 'time'],
    ],
  },
);
