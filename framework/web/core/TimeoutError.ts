import ApiError from 'core/ApiError';

export default class TimeoutError extends ApiError {
  constructor(msg: string) {
    super(msg);

    this.status = 503;
  }
}
