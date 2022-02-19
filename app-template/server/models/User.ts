import BaseUser from 'lib/Model/BaseUser';
import mergeConcatArrays from 'lib/mergeConcatArrays';

export default class User extends BaseUser implements IUser {
  static dbJsonSchema = mergeConcatArrays(BaseUser.dbJsonSchema, {
    type: 'object',
    required: [],
    properties: {
      photoUrl: SchemaConstants.urlOrEmpty,
    },
    additionalProperties: false,
  });

  photoUrl!: string;
}
