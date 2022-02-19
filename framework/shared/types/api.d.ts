type ApiErrorData = {
  msg: string,
  stack?: string[],
  debugDetails?: any,
};

type ApiErrorResponse = {
  status: number,
  error: ApiErrorObject,
};

type ModelSerializedForApi = {
  type: ModelType,
  id: number | string,
  extras?: ObjectOf<any>,
};

type ApiSuccessResponse<Name extends ApiName> = {
  status: 200,
  data: ApiNameToData[Name],
  entities: ModelSerializedForApi[],
  createdEntities?: ModelSerializedForApi[],
  updatedEntities?: ModelSerializedForApi[],
  deletedIds?: Partial<Record<ModelType, EntityId[]>>,
  meta?: {
    dateProps?: Partial<Record<ModelType, string[]>>,
  },
};

type ApiResponse<Name extends ApiName> = ApiSuccessResponse<Name> | ApiErrorResponse;

type SseResponse = ApiSuccessResponse<any> & {
  eventType: string,
};

type OSTypes = 'android' | 'ios' | 'mobile' | 'windows' | 'osx' | 'linux' | 'other' | 'unknown';
