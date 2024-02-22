export default class ApiError extends Error {
  status: number;

  constructor(
    msg: string,
    status?: number,
    debugCtx?: ObjectOf<any>,
  ) {
    super(msg);

    this.status = status ?? 503;
    this.debugCtx = debugCtx;
  }
}
