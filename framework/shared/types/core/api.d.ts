type ApiEntityId = number | string;

type ModelSerializedForApi = {
  type: ModelType,
  id: ApiEntityId,
  extras?: ObjectOf<any>,
  includedRelations?: string[],
};

type ApiRelationConfig = Memoed<{
  name: string,
  relationType: ModelRelationType,
  fromModel: ModelType,
  fromCol: string,
  toModel: ModelType,
  toCol: string,
  through?: {
    model: ModelType,
    from: string,
    to: string,
  },
}>;

type ApiRelationConfigs = Partial<Record<ModelType, ObjectOf<ApiRelationConfig>>>;

type ApiSuccessResponse<Name extends ApiName> = {
  status: 200,
  data: ApiNameToData[Name],
  entities: ModelSerializedForApi[],
  createdEntities?: ModelSerializedForApi[],
  updatedEntities?: ModelSerializedForApi[],
  deletedIds?: Partial<Record<ModelType, EntityId[]>>,
  meta?: {
    dateProps?: Partial<Record<ModelType, string[]>>,
    relationConfigs?: ApiRelationConfigs,
  },
};

type ApiErrorData = {
  msg: string,
  stack?: string[],
  debugCtx?: any,
};

type ApiErrorResponse = {
  status: number,
  error: ApiErrorData,
};

type ApiResponse<Name extends ApiName> = ApiSuccessResponse<Name> | ApiErrorResponse;

type ApiAllRelations = Partial<{
  [T in ModelType]: keyof ModelRelationTypes<T> extends never
    ? never
    : (keyof ModelRelationTypes<T> & string)[];
}>;

type ApiParams<Name extends ApiName> = ApiNameToParams[Name] & {
  relations?: ApiAllRelations,
};

type SseResponse = ApiSuccessResponse<any> & {
  eventType: string,
};
