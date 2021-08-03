type ApiErrorData = {
  msg: string,
  stack?: string[],
  debugDetails?: any,
};

type ApiErrorResponse = {
  status: number,
  error: ApiErrorObject,
};

type ApiSuccessResponse<Name extends ApiName> = {
  status: 200,
  data: ApiNameToData[Name],
  entities: SerializedEntity[],
  // todo: low/mid move deleteIds to meta
  deletedIds?: {
    [T in EntityType]?: number[];
  },
  meta?: {
    dateProps?: {
      [T in EntityType]?: string[];
    },
  },
};

type ApiResponse<Name extends ApiName> = ApiSuccessResponse<Name> | ApiErrorResponse;
