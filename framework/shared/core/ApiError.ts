export default class ApiError extends Error {
  status: number;
  code?: ApiErrorCode;
  data?: ObjectOf<any>;

  constructor(
    msg: string,
    statusOrOpts: number
      | {
        status: number,
        code?: ApiErrorCode,
        data?: ObjectOf<any>,
        debugCtx?: ObjectOf<any>,
      },
  ) {
    super(msg);

    this.status = (typeof statusOrOpts === 'number' ? statusOrOpts : statusOrOpts.status);
    this.code = typeof statusOrOpts === 'number' ? undefined : statusOrOpts.code;
    this.data = typeof statusOrOpts === 'number' ? undefined : statusOrOpts.data;
    this.debugCtx = typeof statusOrOpts === 'number' ? undefined : statusOrOpts.debugCtx;
  }
}
