export default class UserFacingError extends Error {
  status: number;

  debugCtx: string;

  constructor(msg: string, status: number, debugCtx = '') {
    super(msg);
    this.status = status;
    this.debugCtx = debugCtx;
  }
}
