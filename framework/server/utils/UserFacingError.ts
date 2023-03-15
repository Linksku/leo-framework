export default class UserFacingError extends Error {
  status: number;

  constructor(msg: string, status: number, debugCtx?: ObjectOf<any>) {
    super(msg);
    this.status = status;
    this.debugCtx = debugCtx;
  }
}
