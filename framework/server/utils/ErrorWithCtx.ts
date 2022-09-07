export default class AppError extends Error {
  debugCtx: string;

  constructor(msg: string, debugCtx: string) {
    super(msg);

    this.debugCtx = debugCtx;
  }
}
