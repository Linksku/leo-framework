import createEntityClass from 'core/models/createEntityClass';
import { NOTIF_CHANNELS_ARR } from 'config/notifs';

export default createEntityClass(
  {
    type: 'notifSetting',
    deleteable: true,
    schema: {
      id: SchemaConstants.id,
      userId: SchemaConstants.id,
      channel: {
        type: 'string',
        enum: NOTIF_CHANNELS_ARR,
        tsType: 'NotifChannel',
      },
      push: { type: 'boolean' },
      email: { type: 'boolean' },
    },
    uniqueIndexes: [
      'id',
      ['userId', 'channel'],
    ],
  },
);
