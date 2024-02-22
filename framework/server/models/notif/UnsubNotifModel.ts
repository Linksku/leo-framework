import createEntityClass from 'services/model/createEntityClass';
import { UNSUB_NOTIF_ENTITIES } from 'config/notifs';

export default createEntityClass(
  {
    type: 'unsubNotif',
    deleteable: true,
    schema: {
      id: SchemaConstants.id,
      userId: SchemaConstants.id,
      entityType: {
        type: 'string',
        enum: UNSUB_NOTIF_ENTITIES,
        tsType: 'UnsubNotifEntity',
      },
      entityId: SchemaConstants.id,
      time: SchemaConstants.timestampDefaultNow,
    },
    uniqueIndexes: [
      'id',
      ['entityType', 'entityId', 'userId'],
    ],
  },
);
