import createVirtualModelClass from 'services/model/createVirtualModelClass';

export default createVirtualModelClass(
  {
    type: 'virtualRenderedNotif',
    schema: {
      notifId: SchemaConstants.id,
      content: SchemaConstants.content,
      contentBoldRanges: {
        type: 'array',
        items: {
          type: 'array',
          items: [
            { type: 'integer', minimum: 0 },
            { type: 'integer', minimum: 0 },
          ],
          minItems: 2,
          maxItems: 2,
        },
      },
      path: { type: 'string', maxLength: 255 },
    },
    idColumn: 'notifId',
  },
);
