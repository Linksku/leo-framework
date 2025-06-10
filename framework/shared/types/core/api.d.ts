type ApiEntityId = number | string;

type ModelSerializedForApi = {
  type: RRModelType,
  id: ApiEntityId,
  includedRelations?: string[],
};

type ApiRelationConfig = {
  name: string,
  relationType: ModelRelationType,
  fromModel: RRModelType,
  fromCol: string,
  toModel: RRModelType,
  toCol: string,
  through?: {
    model: RRModelType,
    from: string,
    to: string,
  },
};

type ApiRelationConfigs = Partial<Record<RRModelType, ObjectOf<ApiRelationConfig>>>;

type ApiSuccessResponse<Name extends ApiName> = {
  status: 200,
  data: ApiNameToData[Name],
  entities: ModelSerializedForApi[],
  createdEntities?: ModelSerializedForApi[],
  updatedEntities?: ModelSerializedForApi[],
  deletedIds?: Partial<Record<RRModelType, ApiEntityId[]>>,
  meta?: {
    dateProps?: Partial<Record<RRModelType, string[]>>,
    relationConfigs?: ApiRelationConfigs,
  },
};

type ApiErrorCode =
  | 'CREATE_CLUB_ALIAS_EXISTS'
  | 'CREATE_CLUB_ALREADY_EXISTS'
  | 'CREATE_CLUB_WRONG_PARENT'
  | 'POST_IMAGE_DUPLICATED'
  | 'POST_MEDIA_WRONG_CLUB';

type ApiErrorData = {
  msg: string,
  code?: ApiErrorCode,
  stack?: string[],
  data?: ObjectOf<any>,
  debugCtx?: ObjectOf<any>,
};

type ApiErrorResponse = {
  status: number,
  error: ApiErrorData,
  data?: null,
};

type ApiResponse<Name extends ApiName> = ApiSuccessResponse<Name> | ApiErrorResponse;

// Maybe "T in RRModelType as keyof AllModelRelationsMap[T] extends never ? never : T"
type _ApiAllRelations = Partial<{
  [T in RRModelType]: (keyof AllModelRelationsMap[T] & string)[];
}>;

// eslint-disable-next-line @typescript-eslint/no-empty-interface,  @typescript-eslint/no-empty-object-type
interface ApiAllRelations extends _ApiAllRelations {}

type ApiParams<Name extends ApiName> = ApiNameToParams[Name] & {
  // todo: low/med clean up relations error message
  relations?: ApiAllRelations,
  nonce?: string,
};

type SseResponse = ApiSuccessResponse<any> & {
  eventType: string,
};
