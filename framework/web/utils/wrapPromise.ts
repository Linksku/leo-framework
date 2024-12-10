export default function wrapPromise<T extends Promise<any>>(
  promise: T,
  severity: 'warn' | 'error' | 'fatal',
  ctx?: string,
): void {
  promise.catch(err => {
    if (ctx) {
      return ErrorLogger[severity](err, { ctx });
    }
    return ErrorLogger[severity](err);
  });
}
