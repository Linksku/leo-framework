type ApiEntityId = number | string;

type ModelSerializedForApi = {
  type: RRModelType,
  id: ApiEntityId,
  extras?: ObjectOf<any>,
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

// Maybe "T in RRModelType as keyof AllModelRelationsMap[T] extends never ? never : T"
type _ApiAllRelations = Partial<{
  [T in RRModelType]: (keyof AllModelRelationsMap[T] & string)[];
}>;

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface ApiAllRelations extends _ApiAllRelations {}

type ApiParams<Name extends ApiName> = ApiNameToParams[Name] & {
  // todo: low/mid clean up relations error
  relations?: ApiAllRelations,
};

type SseResponse = ApiSuccessResponse<any> & {
  eventType: string,
};
