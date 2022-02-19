export default class ApiError<Name extends ApiName> extends Error {
  apiName: string;
  status: number;
  apiStack?: string[];
  debugDetails?: any;

  constructor(
    apiName: Name,
    status?: number,
    errorData?: ApiErrorData,
  ) {
    const msg = errorData?.msg
      ?? 'Unknown error occurred while fetching data.';

    super(msg);

    this.apiName = apiName;
    this.status = status ?? 503;
    if (errorData) {
      this.apiStack = errorData.stack;
      this.debugDetails = errorData.debugDetails;
    }
  }
}
