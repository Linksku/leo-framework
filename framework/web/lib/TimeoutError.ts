export default class TimeoutError extends Error {
  status: number;

  constructor(msg: string) {
    super(msg);

    this.status = 503;
  }
}
