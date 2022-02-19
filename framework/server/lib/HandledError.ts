export default class HandledError extends Error {
  status;

  debugDetails;

  constructor(msg: string, status: number, debugDetails = null as any) {
    super(msg);
    this.status = status;
    this.debugDetails = debugDetails;
  }
}
