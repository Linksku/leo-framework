type ApiEntityId = number | string;

type ModelSerializedForApi = {
  type: ModelType,
  id: ApiEntityId,
  extras?: ObjectOf<any>,
  devRelations?: string[],
};

type ApiRelationConfig = {
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
};

type ApiRelationsConfigs = Partial<Record<ModelType, ObjectOf<ApiRelationConfig>>>;

type ApiSuccessResponse<Name extends ApiName> = {
  status: 200,
  data: ApiNameToData[Name],
  entities: ModelSerializedForApi[],
  createdEntities?: ModelSerializedForApi[],
  updatedEntities?: ModelSerializedForApi[],
  deletedIds?: Partial<Record<ModelType, EntityId[]>>,
  meta?: {
    dateProps?: Partial<Record<ModelType, string[]>>,
    relationConfigs?: ApiRelationsConfigs,
  },
};

type ApiErrorData = {
  msg: string,
  stack?: string[],
  debugDetails?: any,
};

type ApiErrorResponse = {
  status: number,
  error: ApiErrorObject,
};

type ApiResponse<Name extends ApiName> = ApiSuccessResponse<Name> | ApiErrorResponse;

type ApiParams<Name extends ApiName> = ApiNameToParams[Name] & {
  relations?: Partial<{
    [T in ModelType]: (ModelNestedRelations[T] | keyof ModelTypeToRelations<T>)[];
  }>;
};

type SseResponse = ApiSuccessResponse<any> & {
  eventType: string,
};
