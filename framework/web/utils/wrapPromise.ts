export default function wrapPromise<T extends Promise<any>>(
  promise: T,
  severity: 'warn' | 'error' | 'fatal',
  ctx?: string,
): void {
  promise.catch(err => {
    ErrorLogger[severity](err, ctx);
  });
}
